import { APP_VERSION } from "../config/version.js";
import {
  getScrcpyBinaryPath,
  getScrcpyPlatformKey,
  getScrcpySourceRoot,
  isScrcpyBinaryReady,
} from "../config/scrcpy-paths.js";
import { readProtectedJsonBody, sendProtectedJson } from "../utils/protected-http.js";
import {
  SCRCPY_CAPABILITIES,
  createScrcpySession,
  getScrcpySession,
  listScrcpySessions,
  runScrcpyCapabilities,
  stopScrcpySession,
} from "../services/scrcpy/index.js";

export async function handleScrcpyRoute(req, res, method, pathname) {
  if (method === "GET" && pathname === "/api/scrcpy/capabilities") {
    const capabilities = isScrcpyBinaryReady()
      ? await runScrcpyCapabilities().catch(() => SCRCPY_CAPABILITIES)
      : SCRCPY_CAPABILITIES;

    sendProtectedJson(res, 200, {
      success: true,
      version: APP_VERSION,
      platform: getScrcpyPlatformKey(),
      binaryPath: getScrcpyBinaryPath(),
      binaryReady: isScrcpyBinaryReady(),
      sourceRoot: getScrcpySourceRoot(),
      capabilities,
    });
    return true;
  }

  if (method === "GET" && pathname === "/api/scrcpy/sessions") {
    sendProtectedJson(res, 200, {
      success: true,
      version: APP_VERSION,
      sessions: listScrcpySessions(),
    });
    return true;
  }

  const sessionMatch = pathname.match(/^\/api\/scrcpy\/sessions\/([^/]+)$/);

  if (method === "GET" && sessionMatch) {
    const session = getScrcpySession(decodeURIComponent(sessionMatch[1]));

    if (!session) {
      sendProtectedJson(res, 404, {
        success: false,
        version: APP_VERSION,
        error: "Session not found.",
      });
      return true;
    }

    sendProtectedJson(res, 200, {
      success: true,
      version: APP_VERSION,
      session,
    });
    return true;
  }

  if (method === "POST" && pathname === "/api/scrcpy/sessions") {
    try {
      const body = await readProtectedJsonBody(req, res);
      const session = await createScrcpySession(body ?? {});

      sendProtectedJson(res, 201, {
        success: true,
        version: APP_VERSION,
        session,
      });
    } catch (error) {
      sendProtectedJson(res, 500, {
        success: false,
        version: APP_VERSION,
        error: "Failed to start scrcpy session.",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return true;
  }

  if (method === "DELETE" && sessionMatch) {
    const session = await stopScrcpySession(decodeURIComponent(sessionMatch[1]));

    if (!session) {
      sendProtectedJson(res, 404, {
        success: false,
        version: APP_VERSION,
        error: "Session not found.",
      });
      return true;
    }

    sendProtectedJson(res, 200, {
      success: true,
      version: APP_VERSION,
      session,
    });
    return true;
  }

  return false;
}
