import {
  getScrcpyServerJarPath,
  SCRCPY_SERVER_VERSION,
  SCRCPY_WEB_CAST_MODE,
} from "../../config/scrcpy-paths.js";
import { ensureScrcpyServerBuilt } from "../scrcpy-build.js";
import { runWithAdbLock } from "../adb-lock.js";
import { adbForward, adbForwardTcp, adbPush, clearDeviceTunnels, listAdbForward } from "../adb-command.js";
import { logCastError, logCastInfo, logCastWarn } from "./cast-logger.js";
import { listCastFeatures, resolveCastServerOptions } from "./cast-options.js";
import { resolveVideoStreamSummary } from "./video-stream-config.js";
import { connectControlSocket } from "./control-bridge.js";
import {
  buildServerShellCommand,
  buildSocketName,
  CAST_TUNNEL_FORWARD,
  DEFAULT_CAST_SCID,
  getRemoteJarPath,
  pickLocalPort,
} from "./server-args.js";
import { deleteCastSession, getCastSession, setCastSession } from "./session-store.js";
import { stopScrcpyCast } from "./stop-session.js";
import { createStreamStats } from "./stream-stats.js";
import { connectVideoSocket } from "./video-bridge.js";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function startScrcpyCast(serial, options = {}) {
  await ensureScrcpyServerBuilt();

  const existing = getCastSession(serial);

  if (existing) {
    logCastWarn(serial, "cast.start.replace_existing", {
      localPort: existing.localPort,
    });
    await stopScrcpyCast(serial);
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
    streaming: false,
    streamStats: createStreamStats(),
    serverExited: false,
    serverExitCode: null,
    serverExitSignal: null,
    startedAt: Date.now(),
  };

  setCastSession(serial, session);

  try {
    await runWithAdbLock(async () => {
      logCastInfo(serial, "adb.tunnels.clear", {});
      await clearDeviceTunnels(serial);

      logCastInfo(serial, "adb.push.begin", { remote: getRemoteJarPath() });
      await adbPush(serial, jarPath, getRemoteJarPath());
      logCastInfo(serial, "adb.push.done", { remote: getRemoteJarPath() });

      logCastInfo(serial, "adb.forward.begin", { localPort, socketName });
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
    });
  } catch (error) {
    logCastError(serial, "cast.start.adb_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    await stopScrcpyCast(serial);
    throw error;
  }

  session.starting = false;

  logCastInfo(serial, "cast.start.ready", {
    localPort,
    socketName,
    tunnel: CAST_TUNNEL_FORWARD,
    message: "Forward tunnel ready; scrcpy framed stream starts when WebSocket connects",
  });

  const encoded = encodeURIComponent(serial);
  const features = listCastFeatures(serverOptions);
  const video = resolveVideoStreamSummary(options);

  return {
    serial,
    mode: "scrcpy",
    serverVersion: SCRCPY_SERVER_VERSION,
    localPort,
    scid,
    socketName,
    tunnel: CAST_TUNNEL_FORWARD,
    features,
    castOptions: session.castOptions,
    video,
    wsPath: `/api/devices/${encoded}/cast/ws`,
    controlWsPath: serverOptions.control ? `/api/devices/${encoded}/cast/control/ws` : null,
    audio: serverOptions.audio,
    control: serverOptions.control,
  };
}

export async function ensureCastVideoPipe(serial) {
  const session = getCastSession(serial);

  if (!session) {
    throw new Error("Cast session is not active.");
  }

  // ws-scrcpy modified server streams over its own WebSocket server, no scrcpy TCP sockets.
  if (session.webCast ?? SCRCPY_WEB_CAST_MODE) {
    const { ensureServerShell } = await import("./shell-launcher.js");
    await ensureServerShell(session, session.castOptions ?? {});
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
