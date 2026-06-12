import { logHarmonyCastError, logHarmonyCastInfo } from "./cast-logger.js";
import { getHarmonyCastSession } from "./session-store.js";
import { handleHarmonyTouchMessage } from "./touch-control.js";

/**
 * Attach a browser WebSocket client to an already-running session JPEG pipe.
 * @param {import("ws").WebSocket} clientWs
 * @param {string} serial
 */
export async function attachHarmonyCastWebSocket(clientWs, serial) {
  const session = getHarmonyCastSession(serial);

  if (!session) {
    throw new Error("Harmony cast session is not active.");
  }

  if (!session.pipeReady || !session.capture?.active) {
    throw new Error("Harmony cast pipe is not ready. Call cast/start first.");
  }

  let closed = false;
  session.clients.add(clientWs);

  logHarmonyCastInfo(serial, "ws.bridge.attached", {
    clients: session.clients.size,
    frameCount: session.frameCount,
    streaming: session.streaming,
  });

  const onClientMessage = async (data) => {
    if (closed || session.stopping || !session.rpc) {
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
    clientWs.off("message", onClientMessage);
    logHarmonyCastInfo(serial, "ws.bridge.detached", { clients: session.clients.size });
  });

  await new Promise((resolve) => {
    if (clientWs.readyState !== 1) {
      resolve();
      return;
    }

    clientWs.once("close", resolve);
  });
}
