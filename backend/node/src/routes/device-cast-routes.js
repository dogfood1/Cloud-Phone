import { APP_VERSION } from "../config/version.js";
import { isScrcpyServerReady, getScrcpyServerDiagnostics } from "../config/scrcpy-paths.js";
import { ensureScrcpyServerBuilt } from "../services/scrcpy-build.js";
import { logCastError, logCastInfo } from "../services/scrcpy-cast/cast-logger.js";
import {
  getCastSession,
  listCastFeatures,
  resolveCastServerOptions,
  startScrcpyCast,
  stopScrcpyCast,
} from "../services/scrcpy-cast/index.js";
import { summarizeStreamStats } from "../services/scrcpy-cast/stream-stats.js";
import { getCastStartupLogs } from "../services/scrcpy-cast/startup-log.js";
import { resolveDevicePlatform } from "../services/device-platform-registry.js";
import { logHarmonyCastError, logHarmonyCastInfo } from "../services/harmony-cast/cast-logger.js";
import { getHarmonyCastSession, startHarmonyCast } from "../services/harmony-cast/index.js";
import { handleHarmonyCastRoute } from "./harmony-cast-routes.js";
import { getIosCastSession, startIosCast } from "../services/ios-cast/index.js";
import { logIosCastError, logIosCastInfo } from "../services/ios-cast/cast-logger.js";
import { handleIosCastRoute } from "./ios-cast-routes.js";
import { readProtectedJsonBody, sendProtectedJson } from "../utils/protected-http.js";

export {
  handleCastControlWebSocket,
  handleCastWebSocket,
  parseCastWebSocketPath,
} from "./device-cast-ws.js";

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
      features: session
        ? listCastFeatures(resolveCastServerOptions(session.castOptions ?? {}))
        : [],
      stream: summarizeStreamStats(session?.streamStats),
      startupLogs: getCastStartupLogs(session),
    });
    return true;
  }

  return false;
}
