import { APP_VERSION } from "../config/version.js";
import {
  connectIosDevice,
  disconnectIosDevice,
  discoverIosDevices,
} from "../services/ios/ios-device.js";
import { readProtectedJsonBody, sendProtectedJson } from "../utils/protected-http.js";

export async function handleIosDeviceRoute(req, res, method, pathname) {
  if (method === "GET" && pathname === "/api/devices/ios/discover") {
    try {
      const url = new URL(req.url ?? "", "http://localhost");
      const timeoutMs = Number(url.searchParams.get("timeout") ?? 3500);
      const devices = await discoverIosDevices(timeoutMs);

      sendProtectedJson(res, 200, {
        success: true,
        version: APP_VERSION,
        devices,
        total: devices.length,
      });
    } catch (error) {
      sendProtectedJson(res, 500, {
        success: false,
        version: APP_VERSION,
        error: "ios_discover_failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return true;
  }

  if (method === "POST" && pathname === "/api/devices/ios/connect") {
    try {
      const body = await readProtectedJsonBody(req, res);
      const device = await connectIosDevice(body ?? {});

      sendProtectedJson(res, 200, {
        success: true,
        version: APP_VERSION,
        device,
      });
    } catch (error) {
      sendProtectedJson(res, 400, {
        success: false,
        version: APP_VERSION,
        error: "ios_connect_failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return true;
  }

  const disconnectMatch = pathname.match(/^\/api\/devices\/ios\/([^/]+)$/);

  if (method === "DELETE" && disconnectMatch) {
    const serial = decodeURIComponent(disconnectMatch[1]);

    try {
      const removed = await disconnectIosDevice(serial);
      sendProtectedJson(res, 200, {
        success: true,
        version: APP_VERSION,
        serial,
        removed,
      });
    } catch (error) {
      sendProtectedJson(res, 500, {
        success: false,
        version: APP_VERSION,
        error: "ios_disconnect_failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return true;
  }

  return false;
}
