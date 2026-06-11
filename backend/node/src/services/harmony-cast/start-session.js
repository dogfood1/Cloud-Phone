import { pickHarmonyLocalPort } from "../../config/harmony-paths.js";
import { runWithHdcLock } from "../hdc/hdc-lock.js";
import { forwardHarmonyUitestPort, setupHarmonyUitestAgent } from "./agent-setup.js";
import { logHarmonyCastInfo } from "./cast-logger.js";
import { deleteHarmonyCastSession, getHarmonyCastSession, setHarmonyCastSession } from "./session-store.js";
import { appendHarmonyStartupLog } from "./startup-log.js";
import { stopHarmonyCast } from "./stop-session.js";
import { UitestRpcClient } from "./uitest-rpc.js";

export async function startHarmonyCast(serial, options = {}) {
  const existing = getHarmonyCastSession(serial);

  if (existing) {
    await stopHarmonyCast(serial);
  }

  const localPort = pickHarmonyLocalPort();
  const session = {
    serial,
    platform: "harmony",
    mode: "harmony-jpeg",
    localPort,
    castOptions: options,
    clients: new Set(),
    stopping: false,
    streaming: false,
    frameCount: 0,
    startedAt: Date.now(),
    startupLogs: [],
    rpc: null,
    capture: null,
  };

  setHarmonyCastSession(serial, session);
  appendHarmonyStartupLog(session, "后端：开始鸿蒙 cast/start");
  logHarmonyCastInfo(serial, "cast.start", { localPort, options });

  try {
    await runWithHdcLock(async () => {
      appendHarmonyStartupLog(session, "hdc：推送 uitest agent");
      await setupHarmonyUitestAgent(serial);
      session.localPort = await forwardHarmonyUitestPort(serial, localPort);
      appendHarmonyStartupLog(session, `hdc：fport 完成 (local:${session.localPort})`);
    }, { lockKey: serial });

    const rpc = new UitestRpcClient(session.localPort, serial);
    await rpc.connect();
    await rpc.createDriver();
    session.rpc = rpc;
    appendHarmonyStartupLog(session, "uitest：Driver 已创建");

    const encoded = encodeURIComponent(serial);

    return {
      serial,
      platform: "harmony",
      mode: "harmony-jpeg",
      localPort: session.localPort,
      wsPath: `/api/devices/${encoded}/cast/ws`,
      castProtocol: "harmony-jpeg",
      video: {
        codec: "jpeg",
        fps: options?.fps ?? 15,
        scale: options?.scale ?? 0.5,
      },
      startupLogs: session.startupLogs,
    };
  } catch (error) {
    await stopHarmonyCast(serial);
    throw error;
  }
}

export async function ensureHarmonyCastPipe(serial) {
  const session = getHarmonyCastSession(serial);

  if (!session) {
    throw new Error("Harmony cast session is not active.");
  }

  if (session.capture) {
    return session;
  }

  if (!session.rpc) {
    const rpc = new UitestRpcClient(session.localPort, serial);
    await rpc.connect();
    await rpc.createDriver();
    session.rpc = rpc;
  }

  appendHarmonyStartupLog(session, "后端：鸿蒙 JPEG 管道就绪");
  return session;
}
