import { APP_VERSION } from "../config/version.js";
import { streamDeviceCast } from "../services/device-cast-stream.js";
import { getDeviceMirrorOptions } from "../services/device-mirror-options.js";
import { sendJson } from "../utils/http.js";

export async function handleDeviceRoute(req, res, method, pathname) {
  const castStreamMatch = pathname.match(/^\/api\/devices\/([^/]+)\/cast\/stream$/);

  if (method === "GET" && castStreamMatch) {
    const serial = decodeURIComponent(castStreamMatch[1]);
    streamDeviceCast(req, res, serial);
    return true;
  }

  const mirrorOptionsMatch = pathname.match(/^\/api\/devices\/([^/]+)\/mirror-options$/);

  if (method === "GET" && mirrorOptionsMatch) {
    const serial = decodeURIComponent(mirrorOptionsMatch[1]);

    try {
      const options = await getDeviceMirrorOptions(serial);

      sendJson(res, 200, {
        success: true,
        version: APP_VERSION,
        serial,
        ...options,
      });
    } catch (error) {
      sendJson(res, 500, {
        success: false,
        version: APP_VERSION,
        error: "Failed to load mirror options.",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return true;
  }

  return false;
}
