import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import { APP_VERSION } from "../config/version.js";
import { DEVICE_FILES_DEFAULT_OPEN } from "../services/device-file-path.js";
import { listDeviceFiles } from "../services/device-files.js";
import {
  buildDownloadHeaders,
  pullDeviceFile,
  pushDeviceFile,
} from "../services/device-files-transfer.js";
import { safeUnlink } from "../services/device-apps-mutate.js";
import { sendProtectedBuffer, sendProtectedJson } from "../utils/protected-http.js";

/**
 * @returns {Promise<boolean>}
 */
export async function handleDeviceFilesRoute(req, res, method, pathname, url) {
  const listMatch = pathname.match(/^\/api\/devices\/([^/]+)\/files$/);
  const downloadMatch = pathname.match(/^\/api\/devices\/([^/]+)\/files\/download$/);
  const uploadMatch = pathname.match(/^\/api\/devices\/([^/]+)\/files\/upload$/);

  if (method === "GET" && downloadMatch) {
    const serial = decodeURIComponent(downloadMatch[1]);
    const devicePath = url.searchParams.get("path");

    if (!devicePath?.trim()) {
      sendProtectedJson(res, 400, {
        success: false,
        version: APP_VERSION,
        error: "path_required",
        message: "缺少 path 参数。",
      });
      return true;
    }

    try {
      const { buffer, filename } = await pullDeviceFile(serial, devicePath);

      sendProtectedBuffer(res, 200, buffer, "application/octet-stream", buildDownloadHeaders(filename));
    } catch (error) {
      const code = error?.code;
      const status = code === "not_found" ? 404 : code === "is_directory" ? 400 : 500;

      sendProtectedJson(res, status, {
        success: false,
        version: APP_VERSION,
        error: code ?? "device_file_download_failed",
        message: error instanceof Error ? error.message : "下载失败",
      });
    }

    return true;
  }

  if (method === "PUT" && uploadMatch) {
    const serial = decodeURIComponent(uploadMatch[1]);
    const devicePath = url.searchParams.get("path");

    if (!devicePath?.trim()) {
      sendProtectedJson(res, 400, {
        success: false,
        version: APP_VERSION,
        error: "path_required",
        message: "缺少 path 参数（设备上的目标文件路径）。",
      });
      return true;
    }

    const tmpPath = path.join(
      os.tmpdir(),
      `cloud-phone-upload-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );

    try {
      await pipeline(req, fs.createWriteStream(tmpPath));
      const st = await fs.promises.stat(tmpPath);

      if (!st.size) {
        sendProtectedJson(res, 400, {
          success: false,
          version: APP_VERSION,
          error: "upload_empty_body",
          message: "上传内容为空。",
        });
        return true;
      }

      const result = await pushDeviceFile(serial, devicePath, tmpPath);

      sendProtectedJson(res, 200, {
        success: true,
        version: APP_VERSION,
        serial,
        ...result,
        bytes: st.size,
      });
    } catch (error) {
      sendProtectedJson(res, 500, {
        success: false,
        version: APP_VERSION,
        error: error?.code ?? "device_file_upload_failed",
        message: error instanceof Error ? error.message : "上传失败",
      });
    } finally {
      await safeUnlink(tmpPath);
    }

    return true;
  }

  if (method === "GET" && listMatch) {
    const serial = decodeURIComponent(listMatch[1]);
    const requestedPath = url.searchParams.get("path") ?? DEVICE_FILES_DEFAULT_OPEN;

    try {
      const listing = await listDeviceFiles(serial, requestedPath);

      sendProtectedJson(res, 200, {
        success: true,
        version: APP_VERSION,
        serial,
        ...listing,
      });
    } catch (error) {
      sendProtectedJson(res, 500, {
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
