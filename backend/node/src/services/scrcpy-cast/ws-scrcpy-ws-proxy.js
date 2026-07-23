import WS from "ws";

import { logCastError, logCastInfo, logCastWarn } from "./cast-logger.js";
import { getCastSession } from "./session-store.js";
import { appendCastStartupLog } from "./startup-log.js";
import { summarizeWsPacket } from "./ws-packet-summary.js";
import { connectRemoteWebSocket } from "./ws-scrcpy-ws-proxy-connect.js";
import {
  CLIENT_BACKLOG_DROP_BYTES,
  isLikelyKeyframeAnnexB,
  isLikelyVideoAnnexB,
  logProxyPacket,
  toBuffer,
} from "./ws-scrcpy-ws-proxy-hotpath.js";

/**
 * Proxy a browser WebSocket to a device WebSocket endpoint.
 * @param {import("ws").WebSocket} clientWs
 * @param {string} remoteUrl
 * @param {{ prefetchedClientMessages?: unknown[], serial?: string, shouldAbort?: () => boolean }} [options]
 */
export async function proxyWebSocket(clientWs, remoteUrl, options = {}) {
  const serial = options.serial ?? "-";
  const shouldAbort = options.shouldAbort ?? (() => false);
  const clientQueue = [...(options.prefetchedClientMessages ?? [])];
  const counters = {
    clientToRemote: 0,
    remoteToClient: 0,
    queued: 0,
    flushed: 0,
    earlyRemoteFlushed: 0,
  };
  let remoteWs;
  let closed = false;
  /** @type {null | (() => void)} */
  let detachRemoteMessage = null;

  logCastInfo(serial, "ws.proxy.start", {
    remoteUrl,
    prefetched: clientQueue.length,
    clientReadyState: clientWs.readyState,
  });

  const onClientMessage = (data) => {
    if (closed) {
      return;
    }

    counters.clientToRemote += 1;
    logProxyPacket(serial, "client_to_remote", data, counters);

    if (remoteWs && remoteWs.readyState === WS.OPEN) {
      remoteWs.send(data);
      return;
    }

    clientQueue.push(data);
    counters.queued += 1;

    if (counters.queued <= 5 || counters.queued % 20 === 0) {
      logCastInfo(serial, "ws.proxy.client_queued", {
        queueLength: clientQueue.length,
        remoteReady: remoteWs?.readyState ?? "pending",
        totalQueued: counters.queued,
      });
    }
  };

  clientWs.on("message", onClientMessage);
  try {
    options.onProxyListening?.();
  } catch {
    // ignore
  }

  let earlyRemoteMessages = [];
  /** @type {null | ((sink: (data: unknown) => void) => void)} */
  let adoptMessageSink = null;

  try {
    const connected = await connectRemoteWebSocket(remoteUrl, { serial, shouldAbort });
    remoteWs = connected.remoteWs;
    earlyRemoteMessages = connected.earlyRemoteMessages;
    adoptMessageSink = connected.adoptMessageSink;
    detachRemoteMessage = connected.detachMessage;
  } catch (error) {
    clientWs.off("message", onClientMessage);

    if (error?.code === "proxy_connect_aborted") {
      logCastInfo(serial, "ws.proxy.connect_aborted", { remoteUrl });
      if (clientWs.readyState === WS.OPEN) {
        clientWs.close(1000, "cast stopped");
      }
      return null;
    }

    clientWs.close(1011, error instanceof Error ? error.message : "device ws connect failed");
    throw error;
  }

  const forwardRemoteToClient = (data) => {
    if (closed) {
      return;
    }

    counters.remoteToClient += 1;

    if (clientWs.readyState !== WS.OPEN) {
      logCastWarn(serial, "ws.proxy.drop_remote", {
        clientReadyState: clientWs.readyState,
        packet: summarizeWsPacket(data),
      });
      return;
    }

    if (
      isLikelyVideoAnnexB(data) &&
      !isLikelyKeyframeAnnexB(data) &&
      (clientWs.bufferedAmount || 0) > CLIENT_BACKLOG_DROP_BYTES
    ) {
      counters.droppedVideo = (counters.droppedVideo || 0) + 1;
      if (counters.droppedVideo <= 3 || counters.droppedVideo % 300 === 0) {
        logCastWarn(serial, "ws.proxy.drop_backlog_video", {
          bufferedAmount: clientWs.bufferedAmount,
          dropped: counters.droppedVideo,
        });
      }
      return;
    }

    logProxyPacket(serial, "remote_to_client", data, counters);
    clientWs.send(data, { compress: false });
  };

  const closeBoth = (code = 1000, reason = "", source = "unknown") => {
    if (closed) {
      return;
    }

    closed = true;
    clientWs.off("message", onClientMessage);
    detachRemoteMessage?.();
    detachRemoteMessage = null;

    logCastInfo(serial, "ws.proxy.close", {
      source,
      code,
      reason: reason || undefined,
      stats: counters,
      queueRemaining: clientQueue.length,
    });

    try {
      if (clientWs.readyState === WS.OPEN) {
        clientWs.close(code, reason);
      }
    } catch {
      // ignore
    }

    try {
      if (remoteWs.readyState === WS.OPEN) {
        remoteWs.close(code, reason);
      }
    } catch {
      // ignore
    }
  };

  adoptMessageSink?.(forwardRemoteToClient);
  for (const data of earlyRemoteMessages) {
    counters.earlyRemoteFlushed += 1;
    forwardRemoteToClient(data);
  }
  earlyRemoteMessages.length = 0;

  if (counters.earlyRemoteFlushed > 0) {
    logCastInfo(serial, "ws.proxy.early_remote_flushed", {
      flushed: counters.earlyRemoteFlushed,
    });
  }

  const flushClientQueue = () => {
    if (remoteWs.readyState !== WS.OPEN) {
      logCastWarn(serial, "ws.proxy.flush_skipped", {
        remoteReadyState: remoteWs.readyState,
        queueLength: clientQueue.length,
      });
      return;
    }

    const pending = clientQueue.length;
    while (clientQueue.length > 0) {
      const item = clientQueue.shift();
      remoteWs.send(toBuffer(item));
      counters.flushed += 1;
    }

    if (pending > 0) {
      logCastInfo(serial, "ws.proxy.queue_flushed", {
        flushed: pending,
        totalFlushed: counters.flushed,
      });
    }
  };

  flushClientQueue();

  remoteWs.on("close", (code, reason) => {
    closeBoth(code, reason.toString(), "device_ws_closed");
  });
  remoteWs.on("error", (err) => {
    logCastError(serial, "ws.proxy.remote_error", { message: err?.message ?? "device ws error" });
    closeBoth(1011, err?.message ?? "device ws error", "device_ws_error");
  });

  clientWs.on("close", (code, reason) => {
    closeBoth(code, reason.toString(), "client_ws_closed");
  });
  clientWs.on("error", (err) => {
    logCastError(serial, "ws.proxy.client_error", { message: err?.message ?? "client ws error" });
    closeBoth(1011, err?.message ?? "client ws error", "client_ws_error");
  });

  logCastInfo(serial, "ws.proxy.ready", { remoteUrl, stats: counters });
  appendCastStartupLog(getCastSession(serial), "后端：WebSocket 代理已连接设备 scrcpy-server");

  return remoteWs;
}
