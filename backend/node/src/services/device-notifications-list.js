import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runAdb } from "./adb-command.js";
import { runWithAdbLock } from "./adb-lock.js";
import { fetchScrcpyAppLabels } from "./device-apps-scrcpy-labels.js";
import { resolvePrimaryApkPath } from "./device-apps-mutate.js";
import { extractLauncherIconFromApk } from "./device-notifications-apk-icon.js";
import { parseNotificationDump } from "./device-notifications-parse.js";

/** @type {Map<string, { expires: number, iconDataUrl: string | null }>} */
const iconCache = new Map();
const ICON_CACHE_TTL_MS = 10 * 60_000;

/**
 * @param {string} serial
 * @returns {Promise<Array<{
 *   id: string,
 *   key: string,
 *   packageName: string,
 *   appLabel: string,
 *   title: string,
 *   text: string,
 *   postTime: number,
 *   iconDataUrl: string | null,
 * }>>}
 */
export async function listDeviceNotifications(serial) {
  return runWithAdbLock(async () => {
    const { stdout } = await runAdb(
      ["-s", serial, "shell", "dumpsys", "notification", "--noredact"],
      { timeout: 45_000, maxBuffer: 32 * 1024 * 1024 },
    );

    const parsed = parseNotificationDump(stdout);
    const labels = await fetchScrcpyAppLabels(serial).catch(() => new Map());
    const packages = [...new Set(parsed.map((item) => item.packageName))];
    const icons = await loadIconsForPackages(serial, packages);

    const rows = parsed.map((item) => ({
      ...item,
      appLabel: labels.get(item.packageName)?.label ?? item.packageName,
      iconDataUrl: icons.get(item.packageName) ?? null,
    }));

    rows.sort((a, b) => (b.postTime || 0) - (a.postTime || 0));
    return rows.slice(0, 40);
  }, { lockKey: serial });
}

/**
 * @param {string} serial
 * @param {string[]} packages
 * @returns {Promise<Map<string, string | null>>}
 */
async function loadIconsForPackages(serial, packages) {
  /** @type {Map<string, string | null>} */
  const result = new Map();
  const now = Date.now();
  const pending = [];

  for (const packageName of packages) {
    const cacheKey = `${serial}::${packageName}`;
    const cached = iconCache.get(cacheKey);

    if (cached && cached.expires > now) {
      result.set(packageName, cached.iconDataUrl);
      continue;
    }

    pending.push(packageName);
  }

  const settled = await Promise.allSettled(
    pending.map(async (packageName) => {
      const iconDataUrl = await loadPackageIconDataUrl(serial, packageName).catch(() => null);
      iconCache.set(`${serial}::${packageName}`, {
        expires: Date.now() + ICON_CACHE_TTL_MS,
        iconDataUrl,
      });
      return [packageName, iconDataUrl];
    }),
  );

  for (const item of settled) {
    if (item.status === "fulfilled") {
      result.set(item.value[0], item.value[1]);
    }
  }

  return result;
}

/**
 * @param {string} serial
 * @param {string} packageName
 * @returns {Promise<string | null>}
 */
async function loadPackageIconDataUrl(serial, packageName) {
  const remoteApk = await resolvePrimaryApkPath(serial, packageName);
  const tmpPath = path.join(
    os.tmpdir(),
    `cloud-phone-icon-${Date.now()}-${Math.random().toString(16).slice(2)}.apk`,
  );

  try {
    await runAdb(["-s", serial, "pull", remoteApk, tmpPath], { timeout: 60_000 });
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
