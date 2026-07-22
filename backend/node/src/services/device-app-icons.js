import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runAdb } from "./adb-command.js";
import { runWithAdbLock } from "./adb-lock.js";
import { resolvePrimaryApkPath } from "./device-apps-mutate.js";
import { extractLauncherIconFromApk } from "./device-notifications-apk-icon.js";

/** @type {Map<string, string | null>} */
const iconCache = new Map();
/** @type {Set<string>} */
const iconLoading = new Set();

/**
 * @param {string} serial
 * @param {string} packageName
 */
export function getCachedAppIcon(serial, packageName) {
  return iconCache.get(iconCacheKey(serial, packageName)) ?? null;
}

/**
 * @param {string} serial
 * @param {string} packageName
 */
export function hasCachedAppIcon(serial, packageName) {
  return iconCache.has(iconCacheKey(serial, packageName));
}

/**
 * @param {string} serial
 * @param {string[]} packages
 */
export async function loadMissingAppIcons(serial, packages) {
  const missing = packages.filter((pkg) => !iconCache.has(iconCacheKey(serial, pkg)));
  for (const packageName of missing) {
    await loadOneAppIcon(serial, packageName);
  }
}

/**
 * @param {string} serial
 * @param {string[]} packages
 * @param {number} [limit]
 */
export function warmupMissingAppIcons(serial, packages, limit = 4) {
  const missing = packages.filter((pkg) => {
    const key = iconCacheKey(serial, pkg);
    return !iconCache.has(key) && !iconLoading.has(key);
  });

  for (const packageName of missing.slice(0, limit)) {
    void loadOneAppIcon(serial, packageName);
  }
}

/**
 * @param {string} serial
 * @param {string} packageName
 * @returns {Promise<string | null>}
 */
export async function loadOneAppIcon(serial, packageName) {
  const key = iconCacheKey(serial, packageName);
  if (iconCache.has(key) || iconLoading.has(key)) {
    return iconCache.get(key) ?? null;
  }

  iconLoading.add(key);

  try {
    const iconDataUrl = await runWithAdbLock(
      () => pullPackageIconDataUrl(serial, packageName),
      { lockKey: serial },
    );
    iconCache.set(key, iconDataUrl);
    return iconDataUrl;
  } catch {
    iconCache.set(key, null);
    return null;
  } finally {
    iconLoading.delete(key);
  }
}

/**
 * @param {string} serial
 * @param {string} packageName
 * @returns {Promise<string | null>}
 */
async function pullPackageIconDataUrl(serial, packageName) {
  const remoteApk = await resolvePrimaryApkPath(serial, packageName);
  const tmpPath = path.join(
    os.tmpdir(),
    `cloud-phone-icon-${Date.now()}-${Math.random().toString(16).slice(2)}.apk`,
  );

  try {
    await runAdb(["-s", serial, "pull", remoteApk, tmpPath], { timeout: 45_000 });
    const apkBuffer = await fs.readFile(tmpPath);
    const iconBytes = extractLauncherIconFromApk(apkBuffer);

    if (!iconBytes) {
      return null;
    }

    const mime = iconBytes[0] === 0x52 && iconBytes[1] === 0x49 ? "image/webp" : "image/png";
    return `data:${mime};base64,${iconBytes.toString("base64")}`;
  } finally {
    await fs.unlink(tmpPath).catch(() => undefined);
  }
}

function iconCacheKey(serial, packageName) {
  return `${serial}::${packageName}`;
}
