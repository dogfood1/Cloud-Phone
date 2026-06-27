import { readHarmonyDisplaySize } from "../harmony-device.js";
import { pickHarmonyLocalPort } from "../../config/harmony-paths.js";
import { listHdcTargets } from "../hdc/hdc-exec.js";
import { runWithHdcLock } from "../hdc/hdc-lock.js";
import { forwardHarmonyUitestPort, setupHarmonyUitestAgent } from "./agent-setup.js";
import { normalizeHarmonyCastOptions } from "./cast-options.js";
import { logHarmonyCastInfo } from "./cast-logger.js";
import { deleteHarmonyCastSession, getHarmonyCastSession, setHarmonyCastSession } from "./session-store.js";
import { appendHarmonyStartupLog } from "./startup-log.js";
import { stopHarmonyCast } from "./stop-session.js";

export async function startHarmonyCast(serial, options = {}) {
  const existing = getHarmonyCastSession(serial);

  if (existing) {
    await stopHarmonyCast(serial);
  }

  const castOptions = normalizeHarmonyCastOptions(options);
  const localPort = pickHarmonyLocalPort();
  const session = {
    serial,
    platform: "harmony",
    mode: "harmony-jpeg",
    localPort,
    castOptions,
    clients: new Set(),
    stopping: false,
    streaming: false,
    frameCount: 0,
    startedAt: Date.now(),
    startupLogs: [],
    rpc: null,
    capture: null,
    captureBroadcaster: null,
    pipeReady: false,
  };

  setHarmonyCastSession(serial, session);
  appendHarmonyStartupLog(session, "后端：开始鸿蒙 cast/start");
  logHarmonyCastInfo(serial, "cast.start", { localPort, castOptions });

  try {
    const hdcTargets = await listHdcTargets();

    if (!hdcTargets.includes(serial)) {
      throw new Error(`设备 ${serial} 不在 HDC 目标列表中，请确认鸿蒙设备已连接。`);
    }

    await runWithHdcLock(async () => {
      appendHarmonyStartupLog(session, "hdc：推送 uitest agent");
      await setupHarmonyUitestAgent(serial);
      session.localPort = await forwardHarmonyUitestPort(serial, localPort);
      appendHarmonyStartupLog(session, `hdc：fport 完成 (local:${session.localPort})`);
    }, { lockKey: serial });

    appendHarmonyStartupLog(session, "后端：cast/start 完成，等待 WebSocket 连接");

    const displaySize = await readHarmonyDisplaySize(serial);
    session.displaySize = displaySize;

    const encoded = encodeURIComponent(serial);

    return {
      serial,
      platform: "harmony",
      mode: "harmony-jpeg",
      localPort: session.localPort,
      wsPath: `/api/devices/${encoded}/cast/ws`,
      castProtocol: "harmony-jpeg",
      castOptions,
      displaySize,
      video: {
        codec: "jpeg",
        scale: castOptions.scale,
        quality: castOptions.quality,
        nativeWidth: displaySize?.width ?? null,
        nativeHeight: displaySize?.height ?? null,
      },
      streaming: session.streaming,
      frameCount: session.frameCount,
      startupLogs: session.startupLogs,
    };
  } catch (error) {
    await stopHarmonyCast(serial);
    throw error;
  }
}

export { ensureHarmonyCastPipe } from "./cast-pipe.js";
