import { HarmonyJpegCapture } from "./jpeg-capture.js";
import { logHarmonyCastError, logHarmonyCastInfo } from "./cast-logger.js";
import { getHarmonyCastSession } from "./session-store.js";
import { appendHarmonyStartupLog } from "./startup-log.js";
import { handleHarmonyTouchMessage } from "./touch-control.js";

/**
 * @param {import("ws").WebSocket} clientWs
 * @param {string} serial
 */
export async function attachHarmonyCastWebSocket(clientWs, serial) {
  const session = getHarmonyCastSession(serial);

  if (!session?.rpc) {
    throw new Error("Harmony RPC is not ready.");
  }

  let closed = false;
  const capture = new HarmonyJpegCapture(session.rpc, serial);
  session.capture = capture;

  const closeClient = (code = 1000, reason = "") => {
    if (closed) {
      return;
    }

    closed = true;

    if (clientWs.readyState === 1) {
      clientWs.close(code, reason);
    }
  };

  capture.on("frame", (frame) => {
    if (closed || clientWs.readyState !== 1) {
      return;
    }

    session.streaming = true;
    session.frameCount += 1;
    clientWs.send(frame);
  });

  const onClientMessage = async (data) => {
    if (closed || session.stopping) {
      return;
    }

    try {
      const text = Buffer.isBuffer(data) ? data.toString("utf8") : String(data);
      const message = JSON.parse(text);
      await handleHarmonyTouchMessage(session.rpc, message);
    } catch (error) {
      logHarmonyCastError(serial, "touch.failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  };

  clientWs.on("message", onClientMessage);
  clientWs.on("close", () => {
    closed = true;
    session.clients.delete(clientWs);
    void capture.stop();
    session.capture = null;
  });

  session.clients.add(clientWs);
  await capture.start();
  appendHarmonyStartupLog(session, "后端：鸿蒙 JPEG 流已启动");
  logHarmonyCastInfo(serial, "ws.bridge.ready", { clients: session.clients.size });

  await new Promise((resolve) => {
    if (clientWs.readyState !== 1) {
      resolve();
      return;
    }

    clientWs.once("close", resolve);
  });

  clientWs.off("message", onClientMessage);
  closeClient();
}
