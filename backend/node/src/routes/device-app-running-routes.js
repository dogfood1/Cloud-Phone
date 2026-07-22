import { APP_VERSION } from "../config/version.js";
import { getPackageRunningState } from "../services/device-app-running.js";
import { sendProtectedJson } from "../utils/protected-http.js";

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {string} method
 * @param {string} pathname
 */
export async function handleDeviceAppRunningRoute(req, res, method, pathname) {
  const match = pathname.match(/^\/api\/devices\/([^/]+)\/apps\/([^/]+)\/running$/);
  if (!(method === "GET" && match)) {
    return false;
  }

  const serial = decodeURIComponent(match[1]);
  const packageName = decodeURIComponent(match[2]);

  try {
    const state = await getPackageRunningState(serial, packageName);
    sendProtectedJson(res, 200, {
      success: true,
      version: APP_VERSION,
      serial,
      packageName,
      ...state,
    });
  } catch (error) {
    sendProtectedJson(res, 500, {
      success: false,
      version: APP_VERSION,
      serial,
      packageName,
      error: "app_running_check_failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  return true;
}
