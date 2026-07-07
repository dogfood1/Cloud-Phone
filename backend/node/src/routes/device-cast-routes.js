import { APP_VERSION } from "../config/version.js";
import { isScrcpyServerReady, getScrcpyServerDiagnostics } from "../config/scrcpy-paths.js";
import { ensureScrcpyServerBuilt } from "../services/scrcpy-build.js";
import { logCastError, logCastInfo, logCastWarn } from "../services/scrcpy-cast/cast-logger.js";
import {
  attachWebSocketClient,
  ensureCastVideoPipe,
  getCastSession,
  listCastFeatures,
  resolveCastServerOptions,
  startScrcpyCast,
  stopScrcpyCast,
  waitForCastSession,
} from "../services/scrcpy-cast/index.js";
import { summarizeStreamStats } from "../services/scrcpy-cast/stream-stats.js";
import { getCastStartupLogs, appendCastStartupLog } from "../services/scrcpy-cast/startup-log.js";
import { proxyWebSocket } from "../services/scrcpy-cast/ws-scrcpy-ws-proxy.js";
import { resolveDevicePlatform } from "../services/device-platform-registry.js";
import { logHarmonyCastError, logHarmonyCastInfo } from "../services/harmony-cast/cast-logger.js";
import { getHarmonyCastSession, startHarmonyCast } from "../services/harmony-cast/index.js";
import {
  handleHarmonyCastRoute,
  handleHarmonyCastWebSocket,
} from "./harmony-cast-routes.js";
import { getIosCastSession, startIosCast } from "../services/ios-cast/index.js";
import { logIosCastError, logIosCastInfo } from "../services/ios-cast/cast-logger.js";
import {
  handleIosCastRoute,
  handleIosCastWebSocket,
} from "./ios-cast-routes.js";
import { readProtectedJsonBody, sendProtectedJson } from "../utils/protected-http.js";

export async function handleDeviceCastRoute(req, res, method, pathname) {
  const startMatch = pathname.match(/^\/api\/devices\/([^/]+)\/cast\/start$/);
  const stopMatch = pathname.match(/^\/api\/devices\/([^/]+)\/cast\/stop$/);
  const statusMatch = pathname.match(/^\/api\/devices\/([^/]+)\/cast\/status$/);

  if (method === "POST" && startMatch) {
    const serial = decodeURIComponent(startMatch[1]);

    const body = await readProtectedJsonBody(req, res);
    const platform = await resolveDevicePlatform(serial);

    if (platform === "ios") {
      try {
        logIosCastInfo(serial, "api.cast.start", { options: body ?? {} });
        const session = await startIosCast(serial);

        sendProtectedJson(res, 200, {
          success: true,
          version: APP_VERSION,
          ...session,
        });
      } catch (error) {
        logIosCastError(serial, "api.cast.start_failed", {
          message: error instanceof Error ? error.message : "unknown",
        });
        sendProtectedJson(res, 500, {
          success: false,
          version: APP_VERSION,
          error: "ios_cast_start_failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }

      return true;
    }

    if (platform === "harmony") {
      try {
        logHarmonyCastInfo(serial, "api.cast.start", { options: body ?? {} });
        const session = await startHarmonyCast(serial, body ?? {});

        sendProtectedJson(res, 200, {
          success: true,
          version: APP_VERSION,
          ...session,
        });
      } catch (error) {
        logHarmonyCastError(serial, "api.cast.start_failed", {
          message: error instanceof Error ? error.message : "unknown",
        });
        sendProtectedJson(res, 500, {
          success: false,
          version: APP_VERSION,
          error: "harmony_cast_start_failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }

      return true;
    }

    logCastInfo(serial, "api.cast.start.request", { method, pathname });

    try {
      await ensureScrcpyServerBuilt();
    } catch (buildError) {
      sendProtectedJson(res, 503, {
        success: false,
        version: APP_VERSION,
        error: "scrcpy_server_build_failed",
        message:
          buildError instanceof Error
            ? buildError.message
            : "scrcpy-server 编译失败。请安装 Android SDK / JDK 17+ 后执行: node tools/build-scrcpy-server.mjs",
        scrcpyServer: getScrcpyServerDiagnostics(),
      });
      return true;
    }

    try {
      logCastInfo(serial, "api.cast.start", { options: body ?? {} });
      const session = await startScrcpyCast(serial, body ?? {});

      sendProtectedJson(res, 200, {
        success: true,
        version: APP_VERSION,
        ...session,
      });
    } catch (error) {
      logCastError(serial, "api.cast.start_failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
      sendProtectedJson(res, 500, {
        success: false,
        version: APP_VERSION,
        error: "cast_start_failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return true;
  }

  if (method === "DELETE" && stopMatch) {
    const serial = decodeURIComponent(stopMatch[1]);

    if (getIosCastSession(serial) || (await resolveDevicePlatform(serial)) === "ios") {
      return handleIosCastRoute(req, res, method, pathname);
    }

    if (getHarmonyCastSession(serial) || (await resolveDevicePlatform(serial)) === "harmony") {
      return handleHarmonyCastRoute(req, res, method, pathname);
    }

    try {
      logCastInfo(serial, "api.cast.stop", {});
      const stopped = await stopScrcpyCast(serial);

      sendProtectedJson(res, 200, {
        success: true,
        version: APP_VERSION,
        serial,
        stopped,
      });
    } catch (error) {
      sendProtectedJson(res, 500, {
        success: false,
        version: APP_VERSION,
        error: "cast_stop_failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return true;
  }

  if (method === "GET" && statusMatch) {
    const serial = decodeURIComponent(statusMatch[1]);

    if (getIosCastSession(serial) || (await resolveDevicePlatform(serial)) === "ios") {
      return handleIosCastRoute(req, res, method, pathname);
    }

    if (getHarmonyCastSession(serial) || (await resolveDevicePlatform(serial)) === "harmony") {
      return handleHarmonyCastRoute(req, res, method, pathname);
    }

    const session = getCastSession(serial);

    sendProtectedJson(res, 200, {
      success: true,
      version: APP_VERSION,
      serial,
      active: Boolean(session),
      streaming: session?.streaming ?? false,
      serverReady: isScrcpyServerReady(),
      serverExited: session?.serverExited ?? false,
      serverExitCode: session?.serverExitCode ?? null,
      socketName: session?.socketName ?? null,
      localPort: session?.localPort ?? null,
      wsClients: session?.clients.size ?? 0,
      controlWsClients: session?.controlClients?.size ?? 0,
      controlConnected: Boolean(session?.controlSocket),
      features: session ? listCastFeatures(resolveCastServerOptions(session.castOptions ?? {})) : [],
      stream: summarizeStreamStats(session?.streamStats),
      startupLogs: getCastStartupLogs(session),
    });
    return true;
  }

  return false;
}

export function parseCastWebSocketPath(pathname) {
  const videoMatch = pathname.match(/^\/api\/devices\/([^/]+)\/cast\/ws$/);

  if (videoMatch) {
    return { serial: decodeURIComponent(videoMatch[1]), channel: "video" };
  }

  const controlMatch = pathname.match(/^\/api\/devices\/([^/]+)\/cast\/control\/ws$/);

  if (controlMatch) {
    return { serial: decodeURIComponent(controlMatch[1]), channel: "control" };
  }

  return null;
}

export async function handleCastWebSocket(ws, serial) {
  if (getIosCastSession(serial)) {
    await handleIosCastWebSocket(ws, serial);
    return;
  }

  if ((await resolveDevicePlatform(serial)) === "ios") {
    await handleIosCastWebSocket(ws, serial);
    return;
  }

  if (getHarmonyCastSession(serial)) {
    await handleHarmonyCastWebSocket(ws, serial);
    return;
  }

  if ((await resolveDevicePlatform(serial)) === "harmony") {
    await handleHarmonyCastWebSocket(ws, serial);
    return;
  }

  const session = getCastSession(serial);

  if (!session) {
    logCastWarn(serial, "ws.rejected", { reason: "cast session missing" });
    ws.close(1008, "Cast session is not active. Call cast/start first.");
    return;
  }

  const prefetchedClientMessages = [];
  const prefetchClientMessage = (data) => {
    prefetchedClientMessages.push(data);
  };

  ws.on("message", prefetchClientMessage);

  try {
    logCastInfo(serial, "ws.session.begin", {
      webCast: Boolean(session.webCast),
      localPort: session.localPort,
      serverExited: session.serverExited ?? false,
      shellPid: session.shellProcess?.pid ?? null,
    });
    appendCastStartupLog(session, "后端：WebSocket 客户端已接入");

    await ensureCastVideoPipe(serial);

    if (ws.readyState !== 1) {
      logCastWarn(serial, "ws.session.client_closed", { readyState: ws.readyState });
      return;
    }

    logCastInfo(serial, "ws.session.pipe_ready", {
      webCast: Boolean(session.webCast),
      serverExited: session.serverExited ?? false,
      shellPid: session.shellProcess?.pid ?? null,
    });

    // ws-scrcpy server listens at ws://127.0.0.1:<localPort>/
    if (session.webCast) {
      ws.off("message", prefetchClientMessage);

      const remoteUrl = `ws://127.0.0.1:${session.localPort}/`;
      logCastInfo(serial, "ws.proxy.attach", {
        remoteUrl,
        prefetchedMessages: prefetchedClientMessages.length,
      });

      const shouldAbort = () =>
        ws.readyState !== 1 ||
        session.stopping ||
        session.serverExited ||
        getCastSession(serial) !== session;

      const proxied = await proxyWebSocket(ws, remoteUrl, {
        prefetchedClientMessages,
        serial,
        shouldAbort,
      });

      if (!proxied) {
        logCastInfo(serial, "ws.proxy.aborted", { remoteUrl });
      }

      return;
    }

    ws.off("message", prefetchClientMessage);

    // fallback to Cloud-Phone legacy bridge
    logCastInfo(serial, "ws.legacy_bridge", { prefetchedMessages: prefetchedClientMessages.length });
    attachWebSocketClient(session, ws);
    await waitForCastSession(session);
    // legacy path sends ready/session/codec JSON etc (kept for compatibility)
  } catch (error) {
    ws.off("message", prefetchClientMessage);

    const aborted =
      error?.code === "proxy_connect_aborted" ||
      error?.code === "cast_port_wait_aborted" ||
      session.stopping;

    if (aborted) {
      logCastInfo(serial, "ws.aborted", {
        message: error instanceof Error ? error.message : "cast aborted",
      });

      if (ws.readyState === 1) {
        ws.close(1000, "cast stopped");
      }

      return;
    }

    logCastError(serial, "ws.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    session.clients.delete(ws);
    ws.close(1011, error instanceof Error ? error.message : "Cast failed");
  }
}

export async function handleCastControlWebSocket(ws, serial) {
  // Deprecated for ws-scrcpy protocol: video+control share the same WebSocket.
  ws.close(1000, "Use /cast/ws for ws-scrcpy protocol");
}
