import { APP_VERSION } from "../config/version.js";
import { DEVICE_FILES_DEFAULT_OPEN } from "../services/device-file-path.js";
import { listDeviceFiles } from "../services/device-files.js";
import { getDeviceMirrorOptions } from "../services/device-mirror-options.js";
import { listDeviceEncoders } from "../services/device-video-encoders.js";
import { sendJson } from "../utils/http.js";

export async function handleDeviceRoute(req, res, method, pathname, url) {
  const mirrorOptionsMatch = pathname.match(/^\/api\/devices\/([^/]+)\/mirror-options$/);
  const videoEncodersMatch = pathname.match(/^\/api\/devices\/([^/]+)\/video-encoders$/);
  const filesMatch = pathname.match(/^\/api\/devices\/([^/]+)\/files$/);

  if (method === "GET" && videoEncodersMatch) {
    const serial = decodeURIComponent(videoEncodersMatch[1]);

    try {
      const { videoEncoders, audioEncoders } = await listDeviceEncoders(serial);

      const usedFallback = videoEncoders.some((item) =>
        String(item.label ?? "").includes("(fallback)"),
      );

      sendJson(res, 200, {
        success: true,
        version: APP_VERSION,
        serial,
        videoEncoders,
        audioEncoders,
        warning: usedFallback
          ? "无法读取设备真实编码器列表，已使用通用列表；停止投屏后刷新页面可重试。"
          : undefined,
      });
    } catch (error) {
      const fallbackEncoders = error?.encoders;
      const status = fallbackEncoders?.length ? 200 : 500;

      sendJson(res, status, {
        success: status === 200,
        version: APP_VERSION,
        serial,
        videoEncoders: fallbackEncoders ?? [],
        warning: error instanceof Error ? error.message : "Unknown error",
        error: status === 500 ? "video_encoders_failed" : undefined,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return true;
  }

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

  if (method === "GET" && filesMatch) {
    const serial = decodeURIComponent(filesMatch[1]);
    const requestedPath = url.searchParams.get("path") ?? DEVICE_FILES_DEFAULT_OPEN;

    try {
      const listing = await listDeviceFiles(serial, requestedPath);

      sendJson(res, 200, {
        success: true,
        version: APP_VERSION,
        serial,
        ...listing,
      });
    } catch (error) {
      sendJson(res, 500, {
        success: false,
        version: APP_VERSION,
        error: "device_files_failed",
        message: error instanceof Error ? error.message : "无法读取设备目录",
      });
    }

    return true;
  }

  return false;
}
