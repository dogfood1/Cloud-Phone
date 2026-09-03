import { APP_VERSION } from "../config/version.js";
import {
  MAX_DEVICE_CLIPBOARD_BYTES,
  readDeviceClipboard,
  writeDeviceClipboard,
} from "../services/device-clipboard.js";
import { readProtectedJsonBody, sendProtectedJson } from "../utils/protected-http.js";

export async function handleDeviceClipboardRoute(req, res, method, pathname) {
  const match = pathname.match(/^\/api\/devices\/([^/]+)\/clipboard$/);

  if (!match || (method !== "GET" && method !== "POST")) {
    return false;
  }

  const serial = decodeURIComponent(match[1]);

  try {
    if (method === "GET") {
      const result = await readDeviceClipboard(serial);
      sendProtectedJson(res, 200, {
        success: true,
        version: APP_VERSION,
        serial,
        maxBytes: MAX_DEVICE_CLIPBOARD_BYTES,
        ...result,
      });
      return true;
    }

    const body = await readProtectedJsonBody(req, res);
    const result = await writeDeviceClipboard(serial, body?.text);
    sendProtectedJson(res, 200, {
      success: true,
      version: APP_VERSION,
      serial,
      maxBytes: MAX_DEVICE_CLIPBOARD_BYTES,
      ...result,
    });
  } catch (error) {
    const code =
      error?.code ?? (method === "GET" ? "clipboard_read_failed" : "clipboard_write_failed");
    const status =
      code === "clipboard_text_required" || code === "clipboard_text_too_large" ? 400 : 500;
    sendProtectedJson(res, status, {
      success: false,
      version: APP_VERSION,
      serial,
      maxBytes: MAX_DEVICE_CLIPBOARD_BYTES,
      error: code,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  return true;
}
