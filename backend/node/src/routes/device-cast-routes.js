import { APP_VERSION } from "../config/version.js";
import { isScrcpyServerReady } from "../config/scrcpy-paths.js";
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
import { proxyWebSocket } from "../services/scrcpy-cast/ws-scrcpy-ws-proxy.js";
import { readJsonBody, sendJson } from "../utils/http.js";

export async function handleDeviceCastRoute(req, res, method, pathname) {
  const startMatch = pathname.match(/^\/api\/devices\/([^/]+)\/cast\/start$/);
  const stopMatch = pathname.match(/^\/api\/devices\/([^/]+)\/cast\/stop$/);
  const statusMatch = pathname.match(/^\/api\/devices\/([^/]+)\/cast\/status$/);

  if (method === "POST" && startMatch) {
    const serial = decodeURIComponent(startMatch[1]);

    logCastInfo(serial, "api.cast.start.request", { method, pathname });

    try {
      await ensureScrcpyServerBuilt();
    } catch (buildError) {
      sendJson(res, 503, {
        success: false,
        version: APP_VERSION,
        error: "scrcpy_server_build_failed",
        message:
          buildError instanceof Error
            ? buildError.message
            : "scrcpy-server 编译失败。请安装 Android SDK / JDK 17+ 后执行: node tools/build-scrcpy-server.mjs",
      });
      return true;
    }

    try {
      const body = await readJsonBody(req);
      logCastInfo(serial, "api.cast.start", { options: body ?? {} });
      const session = await startScrcpyCast(serial, body ?? {});

      sendJson(res, 200, {
        success: true,
        version: APP_VERSION,
        ...session,
      });
    } catch (error) {
      logCastError(serial, "api.cast.start_failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
      sendJson(res, 500, {
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

    try {
      logCastInfo(serial, "api.cast.stop", {});
      const stopped = await stopScrcpyCast(serial);

      sendJson(res, 200, {
        success: true,
        version: APP_VERSION,
        serial,
        stopped,
      });
    } catch (error) {
      sendJson(res, 500, {
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
    const session = getCastSession(serial);

    sendJson(res, 200, {
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
  const session = getCastSession(serial);

  if (!session) {
    logCastWarn(serial, "ws.rejected", { reason: "cast session missing" });
    ws.close(1008, "Cast session is not active. Call cast/start first.");
    return;
  }

  try {
    await ensureCastVideoPipe(serial);

    // ws-scrcpy server listens at ws://127.0.0.1:<localPort>/
    if (session.webCast) {
      proxyWebSocket(ws, `ws://127.0.0.1:${session.localPort}/`);
      return;
    }

    // fallback to Cloud-Phone legacy bridge
    attachWebSocketClient(session, ws);
    await waitForCastSession(session);
    // legacy path sends ready/session/codec JSON etc (kept for compatibility)
  } catch (error) {
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
