import { APP_VERSION } from "../config/version.js";
import { isScrcpyServerReady } from "../config/scrcpy-paths.js";
import {
  attachWebSocketClient,
  ensureCastVideoPipe,
  getCastSession,
  startScrcpyCast,
  stopScrcpyCast,
} from "../services/scrcpy-cast/index.js";
import { readJsonBody, sendJson } from "../utils/http.js";

export async function handleDeviceCastRoute(req, res, method, pathname) {
  const startMatch = pathname.match(/^\/api\/devices\/([^/]+)\/cast\/start$/);
  const stopMatch = pathname.match(/^\/api\/devices\/([^/]+)\/cast\/stop$/);
  const statusMatch = pathname.match(/^\/api\/devices\/([^/]+)\/cast\/status$/);

  if (method === "POST" && startMatch) {
    const serial = decodeURIComponent(startMatch[1]);

    if (!isScrcpyServerReady()) {
      sendJson(res, 503, {
        success: false,
        version: APP_VERSION,
        error: "scrcpy_server_missing",
        message:
          "scrcpy-server 未安装。请运行: node tools/build-scrcpy.mjs（无 Meson 时会自动下载官方预编译包）",
      });
      return true;
    }

    try {
      const body = await readJsonBody(req);
      const session = await startScrcpyCast(serial, body ?? {});

      sendJson(res, 200, {
        success: true,
        version: APP_VERSION,
        ...session,
      });
    } catch (error) {
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
    await stopScrcpyCast(serial);

    sendJson(res, 200, {
      success: true,
      version: APP_VERSION,
      serial,
    });
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
    });
    return true;
  }

  return false;
}

export function getCastWebSocketPathname(pathname) {
  const match = pathname.match(/^\/api\/devices\/([^/]+)\/cast\/ws$/);

  if (!match) {
    return null;
  }

  return decodeURIComponent(match[1]);
}

export async function handleCastWebSocket(ws, serial) {
  try {
    const session = await ensureCastVideoPipe(serial);
    attachWebSocketClient(session, ws);

    ws.send(
      JSON.stringify({
        type: "ready",
        serial,
        codec: "h264",
        mode: "annex-b",
      }),
    );
  } catch (error) {
    ws.close(1011, error instanceof Error ? error.message : "Cast failed");
  }
}
