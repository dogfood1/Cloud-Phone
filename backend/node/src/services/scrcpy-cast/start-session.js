import {
  getScrcpyServerJarPath,
  SCRCPY_SERVER_VERSION,
  SCRCPY_WEB_CAST_MODE,
} from "../../config/scrcpy-paths.js";
import { ensureScrcpyServerBuilt } from "../scrcpy-build.js";
import { runWithAdbLock } from "../adb-lock.js";
import { adbForward, adbForwardTcp, adbPush, clearDeviceTunnels, listAdbForward } from "../adb-command.js";
import { logCastError, logCastInfo, logCastWarn } from "./cast-logger.js";
import { appendCastStartupLog } from "./startup-log.js";
import { resolveCastServerOptions } from "./cast-options.js";
import { connectControlSocket } from "./control-bridge.js";
import {
  buildSocketName,
  CAST_TUNNEL_FORWARD,
  DEFAULT_CAST_SCID,
  getRemoteJarPath,
  pickLocalPort,
} from "./server-args.js";
import { getCastSession, setCastSession } from "./session-store.js";
import {
  buildCastStartPayload,
  tryReuseCastSession,
  waitForCastSessionReady,
} from "./session-reuse.js";
import { stopScrcpyCast } from "./stop-session.js";
import { createStreamStats } from "./stream-stats.js";
import { connectVideoSocket } from "./video-bridge.js";
import { waitForLocalPortOpen } from "./wait-for-local-port.js";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function startScrcpyCast(serial, options = {}) {
  await ensureScrcpyServerBuilt();

  let existing = getCastSession(serial);

  if (existing?.starting) {
    logCastInfo(serial, "cast.start.wait_inflight", {
      localPort: existing.localPort,
    });
    appendCastStartupLog(existing, "后端：等待进行中的 cast/start 完成以便复用");
    const ready = await waitForCastSessionReady(existing, serial);
    existing = getCastSession(serial);
    if (ready && existing) {
      const reused = tryReuseCastSession(existing, serial, options);
      if (reused) {
        return reused;
      }
    }
  } else {
    const reused = tryReuseCastSession(existing, serial, options);
    if (reused) {
      return reused;
    }
  }

  existing = getCastSession(serial);
  if (existing) {
    logCastWarn(serial, "cast.start.replace_existing", {
      localPort: existing.localPort,
    });
    await stopScrcpyCast(serial, { force: true });
  }

  const scid = DEFAULT_CAST_SCID;
  const localPort = pickLocalPort();
  const socketName = buildSocketName(scid);
  const jarPath = getScrcpyServerJarPath();
  const serverOptions = resolveCastServerOptions(options);
  const isWsScrcpy = SCRCPY_WEB_CAST_MODE;

  logCastInfo(serial, "cast.start", {
    serverVersion: SCRCPY_SERVER_VERSION,
    scid: "default",
    localPort,
    socketName,
    tunnel: CAST_TUNNEL_FORWARD,
    options,
    jarPath,
  });

  const session = {
    serial,
    scid,
    socketName,
    localPort,
    tunnelMode: CAST_TUNNEL_FORWARD,
    serverVersion: SCRCPY_SERVER_VERSION,
    webCast: SCRCPY_WEB_CAST_MODE,
    castOptions: { ...options, ...serverOptions },
    controlClients: new Set(),
    controlSocket: null,
    shellProcess: null,
    videoSocket: null,
    tcpServer: null,
    videoListenPromise: null,
    clients: new Set(),
    starting: true,
    stopping: false,
    streaming: false,
    streamStats: createStreamStats(),
    consumerCount: 1,
    serverExited: false,
    serverExitCode: null,
    serverExitSignal: null,
    startedAt: Date.now(),
    startupLogs: [],
  };

  appendCastStartupLog(session, "后端：开始 cast/start 会话");
  appendCastStartupLog(session, `后端：scrcpy-server 就绪 (${SCRCPY_SERVER_VERSION})`);

  setCastSession(serial, session);

  try {
    await runWithAdbLock(async () => {
      logCastInfo(serial, "adb.tunnels.clear", {});
      appendCastStartupLog(session, "adb：清理旧 forward 隧道");
      await clearDeviceTunnels(serial);

      logCastInfo(serial, "adb.push.begin", { remote: getRemoteJarPath() });
      appendCastStartupLog(session, "adb：push scrcpy-server.jar 开始");
      await adbPush(serial, jarPath, getRemoteJarPath());
      logCastInfo(serial, "adb.push.done", { remote: getRemoteJarPath() });
      appendCastStartupLog(session, "adb：push scrcpy-server.jar 完成");

      logCastInfo(serial, "adb.forward.begin", { localPort, socketName });
      appendCastStartupLog(session, "adb：建立 forward 隧道开始");
      if (isWsScrcpy) {
        // ws-scrcpy modified server listens on tcp:8886 on device
        await adbForwardTcp(serial, localPort, 8886);
      } else {
        await adbForward(serial, localPort, socketName);
      }

      const forwardList = await listAdbForward(serial);
      logCastInfo(serial, "adb.forward.done", {
        localPort,
        socketName,
        forwardList,
      });
      appendCastStartupLog(session, `adb：forward 隧道完成 (local:${localPort})`);
    }, { lockKey: serial });

    if (isWsScrcpy) {
      const { ensureServerShell } = await import("./shell-launcher.js");
      appendCastStartupLog(session, "后端：预启动 scrcpy-server shell");
      await ensureServerShell(session, serverOptions);
    }
  } catch (error) {
    logCastError(serial, "cast.start.adb_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    await stopScrcpyCast(serial, { force: true });
    throw error;
  }

  session.starting = false;

  logCastInfo(serial, "cast.start.ready", {
    localPort,
    socketName,
    tunnel: CAST_TUNNEL_FORWARD,
    message: "Forward tunnel ready; scrcpy framed stream starts when WebSocket connects",
  });
  appendCastStartupLog(session, "后端：cast/start 完成，等待 WebSocket 连接");

  return buildCastStartPayload(session, options);
}

export async function ensureCastVideoPipe(serial) {
  const session = getCastSession(serial);

  if (!session) {
    throw new Error("Cast session is not active.");
  }

  // ws-scrcpy modified server streams over its own WebSocket server, no scrcpy TCP sockets.
  if (session.webCast ?? SCRCPY_WEB_CAST_MODE) {
    const { ensureServerShell } = await import("./shell-launcher.js");
    logCastInfo(serial, "video.pipe.web_cast", {
      localPort: session.localPort,
      serverExited: session.serverExited ?? false,
    });
    appendCastStartupLog(session, "后端：准备 WebSocket 视频管道");
    await ensureServerShell(session, session.castOptions ?? {});

    if (session.serverExited) {
      throw new Error("scrcpy-server shell exited before the cast port became ready.");
    }

    const shouldAbort = () =>
      getCastSession(serial) !== session || session.stopping || session.serverExited;

    await waitForLocalPortOpen(session.localPort, {
      timeoutMs: 15_000,
      shouldAbort,
    });

    if (shouldAbort()) {
      throw new Error("Cast session stopped while waiting for local port.");
    }

    logCastInfo(serial, "video.pipe.web_cast_ready", {
      localPort: session.localPort,
      shellPid: session.shellProcess?.pid ?? null,
      serverExited: session.serverExited ?? false,
    });
    appendCastStartupLog(session, "后端：WebSocket 视频管道就绪");
    return session;
  }

  if (session.videoSocket) {
    return session;
  }

  const { ensureServerShell } = await import("./shell-launcher.js");

  let lastError = new Error("Unable to connect scrcpy video socket.");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    logCastInfo(serial, "video.pipe.retry", {
      attempt: attempt + 1,
      tunnel: CAST_TUNNEL_FORWARD,
      serverExited: session.serverExited ?? false,
    });

    try {
      if (session.serverExited || !session.shellProcess) {
        await ensureServerShell(session, session.castOptions ?? {});
        await delay(500);
      }

      await connectVideoSocket(session);

      if (resolveCastServerOptions(session.castOptions ?? {}).control) {
        await connectControlSocket(session);
      }

      return session;
    } catch (error) {
      lastError = error instanceof Error ? error : lastError;

      if (session.videoSocket) {
        try {
          session.videoSocket.destroy();
        } catch {
          // ignore
        }

        session.videoSocket = null;
      }

      if (session.serverExited) {
        session.shellProcess = null;
      }

      await delay(300);
    }
  }

  logCastError(serial, "video.pipe.give_up", {
    message: lastError.message,
    forwardList: await listAdbForward(serial),
  });

  throw lastError;
}
