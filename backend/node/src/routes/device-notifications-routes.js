import { APP_VERSION } from "../config/version.js";
import { listDeviceNotifications } from "../services/device-notifications-list.js";
import { sendProtectedJson } from "../utils/protected-http.js";

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {string} method
 * @param {string} pathname
 * @param {URL} [url]
 */
export async function handleDeviceNotificationsRoute(req, res, method, pathname, url) {
  const listMatch = pathname.match(/^\/api\/devices\/([^/]+)\/notifications$/);

  if (!(method === "GET" && listMatch)) {
    return false;
  }

  const serial = decodeURIComponent(listMatch[1]);
  const light = url?.searchParams?.get("light") === "1";

  try {
    const notifications = await listDeviceNotifications(serial, { light });

    sendProtectedJson(res, 200, {
      success: true,
      version: APP_VERSION,
      serial,
      notifications,
    });
  } catch (error) {
    sendProtectedJson(res, 500, {
      success: false,
      version: APP_VERSION,
      serial,
      notifications: [],
      error: "notifications_list_failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  return true;
}
