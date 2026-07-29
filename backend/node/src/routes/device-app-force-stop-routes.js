import { APP_VERSION } from "../config/version.js";
import { forceStopPackage } from "../services/device-apps-mutate.js";
import { sendProtectedJson } from "../utils/protected-http.js";

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {string} method
 * @param {string} pathname
 */
export async function handleDeviceAppForceStopRoute(req, res, method, pathname) {
  const match = pathname.match(/^\/api\/devices\/([^/]+)\/apps\/([^/]+)\/force-stop$/);
  if (!(method === "POST" && match)) {
    return false;
  }

  const serial = decodeURIComponent(match[1]);
  const packageName = decodeURIComponent(match[2]);

  try {
    const result = await forceStopPackage(serial, packageName);
    sendProtectedJson(res, 200, {
      success: true,
      version: APP_VERSION,
      serial,
      packageName,
      ...result,
    });
  } catch (error) {
    const code = error?.code === "invalid_package" ? 400 : 500;
    sendProtectedJson(res, code, {
      success: false,
      version: APP_VERSION,
      serial,
      packageName,
      error: error?.code ?? "force_stop_failed",
      message: error instanceof Error ? error.message : "强制停止应用失败",
    });
  }

  return true;
}
