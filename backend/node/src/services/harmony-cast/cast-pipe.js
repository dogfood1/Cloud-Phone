import { HarmonyJpegCapture } from "./jpeg-capture.js";
import { logHarmonyCastInfo } from "./cast-logger.js";
import { getHarmonyCastSession } from "./session-store.js";
import { appendHarmonyStartupLog } from "./startup-log.js";
import { UitestRpcClient } from "./uitest-rpc.js";

export async function ensureHarmonyRpc(session) {
  if (session.rpc?.socket) {
    return session.rpc;
  }

  const rpc = new UitestRpcClient(session.localPort, session.serial);
  await rpc.connectAndCreateDriver();
  session.rpc = rpc;
  appendHarmonyStartupLog(session, "uitest：Driver 已创建");
  return rpc;
}

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
      logHarmonyCastInfo(session.serial, "jpeg.first_frame", {
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
        // ignore broken ws client
      }
    }
  };
}

/**
 * ECHO-style session pipe: one RPC + one JPEG capture for the whole cast session.
 * WebSocket clients only subscribe to frames broadcast from here.
 */
export async function startHarmonyCastPipe(session) {
  if (session.pipeReady && session.capture?.active) {
    return session;
  }

  const rpc = await ensureHarmonyRpc(session);
  wireCaptureBroadcaster(session);

  if (!session.capture) {
    const capture = new HarmonyJpegCapture(rpc, session.serial, session.castOptions ?? {});
    capture.on("frame", session.captureBroadcaster);
    session.capture = capture;
  }

  if (!session.capture.active) {
    await session.capture.start();
    appendHarmonyStartupLog(session, "后端：鸿蒙 JPEG 流已启动");
    logHarmonyCastInfo(session.serial, "cast.pipe.ready", {
      localPort: session.localPort,
      scale: session.castOptions?.scale,
      quality: session.castOptions?.quality,
    });
  }

  session.pipeReady = true;
  return session;
}

export async function ensureHarmonyCastPipe(serial) {
  const session = getHarmonyCastSession(serial);

  if (!session) {
    throw new Error("Harmony cast session is not active.");
  }

  await startHarmonyCastPipe(session);
  appendHarmonyStartupLog(session, "后端：鸿蒙投屏管道就绪");
  return session;
}

export async function stopHarmonyCastPipe(session) {
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
  session.rpc?.close();
  session.rpc = null;
}
