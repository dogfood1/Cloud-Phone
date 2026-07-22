import { APP_VERSION } from "../config/version.js";
import { ensureIconHelperInstalled, getIconHelperStatus } from "../services/icon-helper-ensure.js";
import {
  getIconHelperProgress,
  refreshIconHelperProgress,
  startIconHelperExtract,
} from "../services/icon-helper-extract.js";
import { sendProtectedJson } from "../utils/protected-http.js";

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {string} method
 * @param {string} pathname
 */
export async function handleDeviceIconHelperRoute(req, res, method, pathname) {
  const statusMatch = pathname.match(/^\/api\/devices\/([^/]+)\/icon-helper\/status$/);
  const ensureMatch = pathname.match(/^\/api\/devices\/([^/]+)\/icon-helper\/ensure$/);
  const extractMatch = pathname.match(/^\/api\/devices\/([^/]+)\/icon-helper\/extract$/);
  const progressMatch = pathname.match(/^\/api\/devices\/([^/]+)\/icon-helper\/progress$/);

  if (method === "GET" && statusMatch) {
    const serial = decodeURIComponent(statusMatch[1]);
    try {
      const status = await getIconHelperStatus(serial);
      sendProtectedJson(res, 200, { success: true, version: APP_VERSION, serial, ...status });
    } catch (error) {
      sendProtectedJson(res, 500, {
        success: false,
        version: APP_VERSION,
        serial,
        error: "icon_helper_status_failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
    return true;
  }

  if (method === "POST" && ensureMatch) {
    const serial = decodeURIComponent(ensureMatch[1]);
    try {
      const result = await ensureIconHelperInstalled(serial);
      sendProtectedJson(res, 200, { success: true, version: APP_VERSION, serial, ...result });
    } catch (error) {
      sendProtectedJson(res, 500, {
        success: false,
        version: APP_VERSION,
        serial,
        error: "icon_helper_ensure_failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
    return true;
  }

  if (method === "POST" && extractMatch) {
    const serial = decodeURIComponent(extractMatch[1]);
    try {
      const result = await startIconHelperExtract(serial);
      sendProtectedJson(res, 200, { success: true, version: APP_VERSION, serial, ...result });
    } catch (error) {
      sendProtectedJson(res, 500, {
        success: false,
        version: APP_VERSION,
        serial,
        error: "icon_helper_extract_failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
    return true;
  }

  if (method === "GET" && progressMatch) {
    const serial = decodeURIComponent(progressMatch[1]);
    try {
      const progress = await refreshIconHelperProgress(serial);
      sendProtectedJson(res, 200, {
        success: true,
        version: APP_VERSION,
        serial,
        progress: progress || getIconHelperProgress(serial),
      });
    } catch (error) {
      sendProtectedJson(res, 500, {
        success: false,
        version: APP_VERSION,
        serial,
        error: "icon_helper_progress_failed",
        message: error instanceof Error ? error.message : "Unknown error",
        progress: getIconHelperProgress(serial),
      });
    }
    return true;
  }

  return false;
}
