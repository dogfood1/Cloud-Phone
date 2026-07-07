import { getIosDeviceEndpoint } from "../ios/ios-device.js";
import { logIosCastError, logIosCastInfo } from "./cast-logger.js";
import { WdaMjpegCapture } from "./mjpeg-capture.js";
import { getIosCastSession } from "./session-store.js";
import { appendIosStartupLog } from "./startup-log.js";
import { handleIosTouchMessage } from "./touch-control.js";

function wireCaptureBroadcaster(session) {
  if (session.captureBroadcaster) {
    return;
  }

  session.captureBroadcaster = (frame) => {
    if (session.stopping) {
      return;
    }

    session.streaming = true;
    session.frameCount += 1;

    if (session.frameCount === 1) {
      logIosCastInfo(session.serial, "mjpeg.first_frame", {
        bytes: frame.length,
        clients: session.clients.size,
      });
    }

    for (const client of session.clients) {
      if (client.readyState !== 1) {
        continue;
      }

      try {
        client.send(frame);
      } catch {
        // ignore broken client
      }
    }
  };
}

export async function startIosCastPipe(session) {
  if (session.pipeReady && session.capture?.active) {
    return session;
  }

  wireCaptureBroadcaster(session);

  if (!session.capture) {
    const capture = new WdaMjpegCapture(session.endpoint.host, session.endpoint.mjpegPort);
    capture.on("frame", session.captureBroadcaster);
    capture.on("error", (error) => {
      logIosCastError(session.serial, "mjpeg.error", {
        message: error instanceof Error ? error.message : "unknown",
      });
    });
    session.capture = capture;
  }

  if (!session.capture.active) {
    session.capture.connect();
    appendIosStartupLog(session, "后端：iOS MJPEG 流已连接");
    logIosCastInfo(session.serial, "cast.pipe.ready", {
      host: session.endpoint.host,
      mjpegPort: session.endpoint.mjpegPort,
    });
  }

  session.pipeReady = true;
  return session;
}

export async function ensureIosCastPipe(serial) {
  const session = getIosCastSession(serial);

  if (!session) {
    throw new Error("iOS cast session is not active.");
  }

  await startIosCastPipe(session);
  appendIosStartupLog(session, "后端：iOS 投屏管道就绪");
  return session;
}

export async function stopIosCastPipe(session) {
  if (session.capture) {
    if (session.captureBroadcaster) {
      session.capture.off("frame", session.captureBroadcaster);
    }

    await session.capture.stop().catch(() => {});
    session.capture = null;
  }

  session.captureBroadcaster = null;
  session.pipeReady = false;
  session.streaming = false;
}

export async function attachIosCastWebSocket(clientWs, serial) {
  const session = getIosCastSession(serial);

  if (!session) {
    throw new Error("iOS cast session is not active.");
  }

  if (!session.pipeReady || !session.capture?.active) {
    throw new Error("iOS cast pipe is not ready. Call cast/start first.");
  }

  let closed = false;
  session.clients.add(clientWs);

  const onClientMessage = async (data) => {
    if (closed || session.stopping) {
      return;
    }

    try {
      const text = Buffer.isBuffer(data) ? data.toString("utf8") : String(data);
      const message = JSON.parse(text);
      await handleIosTouchMessage(session, message);
    } catch (error) {
      logIosCastError(serial, "touch.failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  };

  clientWs.on("message", onClientMessage);
  clientWs.on("close", () => {
    closed = true;
    session.clients.delete(clientWs);
    clientWs.off("message", onClientMessage);
    logIosCastInfo(serial, "ws.bridge.detached", { clients: session.clients.size });
  });

  await new Promise((resolve) => {
    if (clientWs.readyState !== 1) {
      resolve();
      return;
    }

    clientWs.once("close", resolve);
  });
}

export async function createIosCastSession(serial) {
  const endpoint = getIosDeviceEndpoint(serial);

  if (!endpoint) {
    throw new Error(`iOS 设备 ${serial} 未注册，请先在「添加设备」中连接 WDA。`);
  }

  return {
    serial,
    platform: "ios",
    mode: "ios-mjpeg",
    endpoint,
    clients: new Set(),
    stopping: false,
    streaming: false,
    frameCount: 0,
    startedAt: Date.now(),
    startupLogs: [],
    capture: null,
    captureBroadcaster: null,
    pipeReady: false,
    touchStart: null,
    touchLast: null,
  };
}
