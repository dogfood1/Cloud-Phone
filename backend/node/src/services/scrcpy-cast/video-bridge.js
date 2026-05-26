import { logCastError, logCastInfo, logCastWarn } from "./cast-logger.js";
import { connectScrcpySocket } from "./socket-connect.js";
import { CAST_TUNNEL_FORWARD } from "./server-args.js";
import {
  createStreamStats,
  logStreamStopped,
  markStreamConnected,
  recordConfigPacket,
  recordForwardedBytes,
  recordMediaFrame,
  recordRawBytes,
  recordStreamSession,
  summarizeStreamStats,
} from "./stream-stats.js";
import { ScrcpyVideoDemuxer } from "./video-demuxer.js";
import { extractH264SpsPpsNals } from "./h264-config.js";

const ANNEXB_START_CODE = Buffer.from([0x00, 0x00, 0x00, 0x01]);

function hasAnnexBStartCode(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
    return false;
  }

  for (let i = 0; i + 3 < buffer.length; i += 1) {
    if (buffer[i] === 0x00 && buffer[i + 1] === 0x00 && buffer[i + 2] === 0x01) {
      return true;
    }
    if (buffer[i] === 0x00 && buffer[i + 1] === 0x00 && buffer[i + 2] === 0x00 && buffer[i + 3] === 0x01) {
      return true;
    }
  }

  return false;
}

function avccToAnnexB(avcc) {
  if (!Buffer.isBuffer(avcc) || avcc.length < 4) {
    return null;
  }

  const parts = [];
  let offset = 0;

  while (offset + 4 <= avcc.length) {
    const length = avcc.readUInt32BE(offset);
    offset += 4;

    if (length <= 0 || offset + length > avcc.length) {
      break;
    }

    parts.push(ANNEXB_START_CODE, avcc.subarray(offset, offset + length));
    offset += length;
  }

  if (!parts.length) {
    return null;
  }

  return Buffer.concat(parts);
}

function ensureAnnexB(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    return null;
  }

  if (hasAnnexBStartCode(buffer)) {
    return buffer;
  }

  return avccToAnnexB(buffer);
}

function createVideoPipeline(session) {
  let spsAnnexb = null;
  let ppsAnnexb = null;

  const demuxer = new ScrcpyVideoDemuxer({
    onCodecId(codecId) {
      logCastInfo(session.serial, "video.codec", { codecId: `0x${codecId.toString(16)}` });
    },
    onSession(videoSession) {
      session.videoWidth = videoSession.width;
      session.videoHeight = videoSession.height;
      recordStreamSession(session.streamStats, videoSession);

      if (session.sessionReadyResolve) {
        session.sessionReadyResolve();
        session.sessionReadyResolve = null;
      }

      logCastInfo(session.serial, "video.session", videoSession);
    },
    onConfig(packet) {
      recordConfigPacket(session.streamStats);

      const extracted = extractH264SpsPpsNals(packet);

      if (!extracted?.sps || !extracted?.pps) {
        return;
      }

      spsAnnexb = Buffer.concat([ANNEXB_START_CODE, Buffer.from(extracted.sps)]);
      ppsAnnexb = Buffer.concat([ANNEXB_START_CODE, Buffer.from(extracted.pps)]);

      // ws-scrcpy WebCodecsPlayer buffers SPS/PPS from incoming NAL units.
      let forwarded = 0;

      for (const client of session.clients) {
        if (client.readyState === client.OPEN) {
          client.send(spsAnnexb);
          client.send(ppsAnnexb);
          forwarded += spsAnnexb.length + ppsAnnexb.length;
        }
      }

      if (forwarded > 0) {
        recordForwardedBytes(session.streamStats, forwarded);
      }
    },
    onMedia(packet, meta) {
      const mediaAnnexb = ensureAnnexB(packet);
      if (!mediaAnnexb) {
        return;
      }

      const payload =
        meta.key && spsAnnexb && ppsAnnexb
          ? Buffer.concat([spsAnnexb, ppsAnnexb, mediaAnnexb])
          : mediaAnnexb;

      recordMediaFrame(session.serial, session, payload, meta);

      let forwarded = 0;

      for (const client of session.clients) {
        if (client.readyState === client.OPEN) {
          client.send(payload);
          forwarded += payload.length;
        }
      }

      if (forwarded > 0) {
        recordForwardedBytes(session.streamStats, forwarded);
      }
    },
    onError(message) {
      logCastError(session.serial, "video.demuxer.error", { message });
    },
  }, { skipInitialDummy: true });

  session.videoDemuxer = demuxer;

  return demuxer;
}

function attachVideoSocketHandlers(session, socket) {
  socket.setNoDelay(true);

  const demuxer = session.videoDemuxer ?? createVideoPipeline(session);

  socket.on("data", (chunk) => {
    recordRawBytes(session.streamStats, chunk.length);

    try {
      demuxer.push(chunk);
    } catch (error) {
      logCastWarn(session.serial, "video.demuxer.fail", {
        message: error instanceof Error ? error.message : "unknown",
      });
      socket.destroy();
    }
  });

  socket.on("close", () => {
    session.videoSocket = null;
    session.streaming = false;
    session.videoDemuxer?.reset();

    const stats = summarizeStreamStats(session.streamStats);

    if (!stats || stats.bytesReceived === 0) {
      logCastWarn(session.serial, "video.socket.closed_empty", {
        tunnel: CAST_TUNNEL_FORWARD,
        serverExited: session.serverExited ?? false,
        serverExitCode: session.serverExitCode ?? null,
        ...stats,
      });
    }

    logStreamStopped(session.serial, session, "socket_closed");
  });

  socket.on("error", (error) => {
    session.videoSocket = null;
    session.streaming = false;
    logCastWarn(session.serial, "video.socket.error", {
      tunnel: CAST_TUNNEL_FORWARD,
      message: error.message,
      serverExited: session.serverExited ?? false,
      wsClients: session.clients.size,
    });
  });
}

export async function connectVideoSocket(session) {
  if (session.videoSocket) {
    logCastInfo(session.serial, "video.connect.reuse", {
      localPort: session.localPort,
      tunnel: CAST_TUNNEL_FORWARD,
    });
    return Promise.resolve(session.videoSocket);
  }

  if (!session.streamStats) {
    session.streamStats = createStreamStats();
  }

  logCastInfo(session.serial, "video.connect.start", {
    localPort: session.localPort,
    socketName: session.socketName,
    tunnel: CAST_TUNNEL_FORWARD,
    wsClients: session.clients.size,
  });

  try {
    const socket = await connectScrcpySocket(session.localPort);
    session.videoSocket = socket;
    session.streaming = true;
    markStreamConnected(session.streamStats);
    createVideoPipeline(session);
    attachVideoSocketHandlers(session, socket);

    logCastInfo(session.serial, "video.connect.ready", {
      localPort: session.localPort,
      socketName: session.socketName,
      tunnel: CAST_TUNNEL_FORWARD,
      message: "connected; demuxing scrcpy framed H.264 packets",
    });

    return socket;
  } catch (error) {
    session.videoSocket = null;
    session.streaming = false;

    logCastError(session.serial, "video.connect.failed", {
      tunnel: CAST_TUNNEL_FORWARD,
      message: error instanceof Error ? error.message : "unknown",
    });

    throw error instanceof Error ? error : new Error("Video socket failed.");
  }
}

export async function waitForVideoConnection(session) {
  if (session.videoSocket) {
    return session.videoSocket;
  }

  return connectVideoSocket(session);
}

export function waitForCastSession(session, timeoutMs = 12_000) {
  if (session.videoWidth && session.videoHeight) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      session.sessionReadyResolve = null;
      reject(new Error("Timed out waiting for scrcpy video session header."));
    }, timeoutMs);

    session.sessionReadyResolve = () => {
      clearTimeout(timeout);
      resolve();
    };
  });
}

export function attachWebSocketClient(session, ws) {
  session.clients.add(ws);

  logCastInfo(session.serial, "ws.client.attached", {
    clients: session.clients.size,
    videoConnected: Boolean(session.videoSocket),
    streaming: session.streaming,
    tunnel: session.tunnelMode,
  });

  // ws-scrcpy protocol uses a single WebSocket for both video (binary) and control messages (binary).
  ws.on("message", (data) => {
    if (!data || !session.controlSocket) {
      return;
    }

    // Client control messages are binary buffers in scrcpy control message format.
    if (typeof data === "string") {
      return;
    }

    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

    if (!buffer.length) {
      return;
    }

    try {
      session.controlSocket.write(buffer);
    } catch {
      // ignore
    }
  });

  ws.on("close", () => {
    session.clients.delete(ws);
    logCastInfo(session.serial, "ws.client.detached", {
      clients: session.clients.size,
      streaming: session.streaming,
    });
  });
}

export function teardownVideoListener(session) {
  session.videoListenPromise = null;
  session.videoConnectionResolve = null;
  session.videoConnectionReject = null;
  session.videoDemuxer = null;
  session.packetMerger = null;

  if (session.tcpServer) {
    try {
      session.tcpServer.close();
    } catch {
      // ignore
    }

    session.tcpServer = null;
  }

  if (session.videoSocket) {
    try {
      session.videoSocket.destroy();
    } catch {
      // ignore
    }

    session.videoSocket = null;
    session.streaming = false;
  }
}

export function buildCastReadyPayload(session, serial) {
  const payload = {
    type: "ready",
    serial,
    codec: "h264",
    mode: "scrcpy",
    stream: summarizeStreamStats(session.streamStats),
  };

  if (session.videoWidth && session.videoHeight) {
    payload.width = session.videoWidth;
    payload.height = session.videoHeight;
  }

  if (session.h264Codec) {
    payload.codecString = session.h264Codec.codec;
    payload.description = Buffer.from(session.h264Codec.description).toString("base64");
  }

  payload.features = listCastFeatures(resolveCastServerOptions(session.castOptions ?? {}));
  payload.control = resolveCastServerOptions(session.castOptions ?? {}).control;

  return payload;
}
