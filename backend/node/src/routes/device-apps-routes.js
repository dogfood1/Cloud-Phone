import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import { APP_VERSION } from "../config/version.js";
import { getPackageDetail } from "../services/device-apps-detail.js";
import { listInstalledApps } from "../services/device-apps-list.js";
import {
  installLocalApk,
  pullApkToTemp,
  resolvePrimaryApkPath,
  safeUnlink,
  setPackageFrozen,
  uninstallPackage,
} from "../services/device-apps-mutate.js";
import { runWithAdbLock } from "../services/adb-lock.js";
import {
  readProtectedJsonBody,
  sendProtectedBuffer,
  sendProtectedJson,
} from "../utils/protected-http.js";

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {string} method
 * @param {string} pathname
 * @param {URL} url
 */
export async function handleDeviceAppsRoute(req, res, method, pathname, url) {
  const installMatch = pathname.match(/^\/api\/devices\/([^/]+)\/apps\/install$/);
  const listMatch = pathname.match(/^\/api\/devices\/([^/]+)\/apps$/);
  const apkMatch = pathname.match(/^\/api\/devices\/([^/]+)\/apps\/([^/]+)\/apk$/);
  const stateMatch = pathname.match(/^\/api\/devices\/([^/]+)\/apps\/([^/]+)\/state$/);
  const detailMatch = pathname.match(/^\/api\/devices\/([^/]+)\/apps\/([^/]+)$/);

  if (method === "PUT" && installMatch) {
    const serial = decodeURIComponent(installMatch[1]);
    const tmpPath = path.join(os.tmpdir(), `cloud-phone-install-${Date.now()}.apk`);

    try {
      await pipeline(req, fs.createWriteStream(tmpPath));
      const st = await fs.promises.stat(tmpPath);

      if (!st.size) {
        sendProtectedJson(res, 400, {
          success: false,
          version: APP_VERSION,
          error: "install_empty_body",
          message: "安装包内容为空。",
        });
        await safeUnlink(tmpPath);
        return true;
      }

      const result = await installLocalApk(serial, tmpPath);

      sendProtectedJson(res, 200, {
        success: true,
        version: APP_VERSION,
        serial,
        ...result,
      });
    } catch (error) {
      sendProtectedJson(res, 500, {
        success: false,
        version: APP_VERSION,
        error: "install_failed",
        message: error instanceof Error ? error.message : "安装失败",
      });
    } finally {
      await safeUnlink(tmpPath);
    }

    return true;
  }

  if (method === "GET" && listMatch) {
    const serial = decodeURIComponent(listMatch[1]);

    try {
      const apps = await listInstalledApps(serial);

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
        error: "device_apps_list_failed",
        message: error instanceof Error ? error.message : "读取应用列表失败",
      });
    }

    return true;
  }

  if (method === "GET" && apkMatch) {
    const serial = decodeURIComponent(apkMatch[1]);
    const packageName = decodeURIComponent(apkMatch[2]);
    let localPath = null;

    try {
      const buffer = await runWithAdbLock(async () => {
        const remote = await resolvePrimaryApkPath(serial, packageName);
        localPath = await pullApkToTemp(serial, remote);
        return fs.promises.readFile(localPath);
      });

      const filename = `${packageName.replace(/[^\w.-]+/g, "_")}.apk`;

      sendProtectedBuffer(res, 200, buffer, "application/vnd.android.package-archive", {
        "Content-Disposition": `attachment; filename="${filename}"`,
      });
    } catch (error) {
      sendProtectedJson(res, 500, {
        success: false,
        version: APP_VERSION,
        error: "apk_pull_failed",
        message: error instanceof Error ? error.message : "导出 APK 失败",
      });
    } finally {
      if (localPath) {
        await safeUnlink(localPath);
      }
    }

    return true;
  }

  if (method === "POST" && stateMatch) {
    const serial = decodeURIComponent(stateMatch[1]);
    const packageName = decodeURIComponent(stateMatch[2]);

    try {
      const body = await readProtectedJsonBody(req, res);

      if (typeof body.frozen !== "boolean") {
        sendProtectedJson(res, 400, {
          success: false,
          version: APP_VERSION,
          error: "invalid_body",
          message: "请求体需包含布尔字段 frozen。",
        });
        return true;
      }

      const frozen = body.frozen;

      const result = await setPackageFrozen(serial, packageName, frozen);

      sendProtectedJson(res, 200, {
        success: true,
        version: APP_VERSION,
        serial,
        packageName,
        frozen,
        ...result,
      });
    } catch (error) {
      sendProtectedJson(res, 500, {
        success: false,
        version: APP_VERSION,
        error: "freeze_failed",
        message: error instanceof Error ? error.message : "操作失败",
      });
    }

    return true;
  }

  if (method === "GET" && detailMatch) {
    const serial = decodeURIComponent(detailMatch[1]);
    const packageName = decodeURIComponent(detailMatch[2]);

    try {
      const detail = await getPackageDetail(serial, packageName);

      sendProtectedJson(res, 200, {
        success: true,
        version: APP_VERSION,
        serial,
        detail,
      });
    } catch (error) {
      const code = error?.code === "package_not_found" ? 404 : 500;

      sendProtectedJson(res, code, {
        success: false,
        version: APP_VERSION,
        error: error?.code ?? "package_detail_failed",
        message: error instanceof Error ? error.message : "读取应用详情失败",
      });
    }

    return true;
  }

  if (method === "DELETE" && detailMatch) {
    const serial = decodeURIComponent(detailMatch[1]);
    const packageName = decodeURIComponent(detailMatch[2]);
    const confirm = url.searchParams.get("confirm");

    if (confirm !== "1") {
      sendProtectedJson(res, 400, {
        success: false,
        version: APP_VERSION,
        error: "confirm_required",
        message: "请在确认卸载后附带参数 confirm=1。",
      });
      return true;
    }

    try {
      const result = await uninstallPackage(serial, packageName);

      sendProtectedJson(res, 200, {
        success: true,
        version: APP_VERSION,
        serial,
        packageName,
        ...result,
      });
    } catch (error) {
      sendProtectedJson(res, 500, {
        success: false,
        version: APP_VERSION,
        error: "uninstall_failed",
        message: error instanceof Error ? error.message : "卸载失败",
      });
    }

    return true;
  }

  return false;
}
