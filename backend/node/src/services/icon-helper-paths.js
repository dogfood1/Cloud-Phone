import fs from "node:fs";
import path from "node:path";

import { PROJECT_ROOT_PATH } from "../config/paths.js";

export const ICON_HELPER_PACKAGE = "com.cloudphone.iconhelper";
export const ICON_HELPER_SERVICE =
  "com.cloudphone.iconhelper/.IconExtractService";
export const ICON_HELPER_CLIPBOARD_RECEIVER =
  "com.cloudphone.iconhelper/.ClipboardReceiver";
export const ICON_HELPER_CLIPBOARD_SHELL =
  "com.cloudphone.iconhelper.ClipboardShell";

export const ICON_HELPER_REMOTE_FILES =
  "/sdcard/Android/data/com.cloudphone.iconhelper/files";

/**
 * @returns {{ apkPath: string, versionPath: string, bundledVersionCode: number }}
 */
export function resolveIconHelperBundle() {
  const dir = path.join(PROJECT_ROOT_PATH, "backend", "bin", "android");
  const apkPath = path.join(dir, "cloud-phone-icon-helper.apk");
  const versionPath = path.join(dir, "cloud-phone-icon-helper.version");

  let bundledVersionCode = 0;
  try {
    bundledVersionCode = Number.parseInt(fs.readFileSync(versionPath, "utf8").trim(), 10) || 0;
  } catch {
    bundledVersionCode = 0;
  }

  if (!fs.existsSync(apkPath)) {
    const err = new Error("未找到 Icon Helper APK（backend/bin/android/cloud-phone-icon-helper.apk）。");
    err.code = "icon_helper_apk_missing";
    throw err;
  }

  if (!bundledVersionCode) {
    const err = new Error("未找到 Icon Helper 版本号文件。");
    err.code = "icon_helper_version_missing";
    throw err;
  }

  return { apkPath, versionPath, bundledVersionCode };
}

/**
 * @param {string} relative
 */
export function iconHelperRemotePath(relative = "") {
  const base = ICON_HELPER_REMOTE_FILES.replace(/\/$/, "");
  const suffix = String(relative || "").replace(/^\//, "");
  return suffix ? `${base}/${suffix}` : base;
}
