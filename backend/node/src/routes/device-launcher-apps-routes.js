import { APP_VERSION } from "../config/version.js";
import { listLauncherApps } from "../services/device-launcher-apps.js";
import { sendProtectedJson } from "../utils/protected-http.js";

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {string} method
 * @param {string} pathname
 * @param {URL} [url]
 */
export async function handleDeviceLauncherAppsRoute(req, res, method, pathname, url) {
  const match = pathname.match(/^\/api\/devices\/([^/]+)\/launcher-apps$/);

  if (!(method === "GET" && match)) {
    return false;
  }

  const serial = decodeURIComponent(match[1]);
  const light = url?.searchParams?.get("light") === "1";
  const packageNamesOnly = url?.searchParams?.get("packageNamesOnly") === "1";

  try {
    const apps = await listLauncherApps(serial, { light, packageNamesOnly });
    sendProtectedJson(res, 200, {
      success: true,
      version: APP_VERSION,
      serial,
      apps,
    });
  } catch (error) {
    sendProtectedJson(res, 500, {
      success: false,
      version: APP_VERSION,
      serial,
      apps: [],
      error: "launcher_apps_failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  return true;
}
