import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runAdb } from "./adb-command.js";
import { runWithAdbLock } from "./adb-lock.js";
import { fetchScrcpyAppLabels } from "./device-apps-scrcpy-labels.js";
import { resolvePrimaryApkPath } from "./device-apps-mutate.js";
import { extractLauncherIconFromApk } from "./device-notifications-apk-icon.js";
import { parseNotificationDump } from "./device-notifications-parse.js";

/** @type {Map<string, string | null>} package cache key -> data URL */
const iconCache = new Map();
/** @type {Set<string>} */
const iconLoading = new Set();
/** @type {Map<string, Map<string, { label: string, system: boolean }>>} */
const labelSnapshot = new Map();

/**
 * @param {string} serial
 * @param {{ light?: boolean }} [options]
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
export async function listDeviceNotifications(serial, options = {}) {
  const light = Boolean(options.light);

  const parsed = await runWithAdbLock(async () => {
    const { stdout } = await runAdb(
      ["-s", serial, "shell", "dumpsys", "notification", "--noredact"],
      { timeout: 20_000, maxBuffer: 32 * 1024 * 1024 },
    );
    return parseNotificationDump(stdout);
  }, { lockKey: serial });

  const labels = await resolveLabels(serial, light);
  const packages = [...new Set(parsed.map((item) => item.packageName))];

  if (light) {
    // Only use cached icons; warm missing packages in background.
    void warmupMissingIcons(serial, packages);
  } else {
    await loadMissingIcons(serial, packages);
  }

  const rows = parsed.map((item) => ({
    ...item,
    appLabel: labels.get(item.packageName)?.label ?? item.packageName,
    iconDataUrl: iconCache.get(iconCacheKey(serial, item.packageName)) ?? null,
  }));

  rows.sort((a, b) => (b.postTime || 0) - (a.postTime || 0));
  return rows.slice(0, 40);
}

/**
 * @param {string} serial
 * @param {boolean} light
 */
async function resolveLabels(serial, light) {
  const cached = labelSnapshot.get(serial);
  if (cached && light) {
    return cached;
  }

  try {
    const labels = await fetchScrcpyAppLabels(serial);
    labelSnapshot.set(serial, labels);
    return labels;
  } catch {
    return cached ?? new Map();
  }
}

/**
 * @param {string} serial
 * @param {string[]} packages
 */
async function loadMissingIcons(serial, packages) {
  const missing = packages.filter((pkg) => !iconCache.has(iconCacheKey(serial, pkg)));
  for (const packageName of missing) {
    await loadOneIcon(serial, packageName);
  }
}

/**
 * @param {string} serial
 * @param {string[]} packages
 */
async function warmupMissingIcons(serial, packages) {
  const missing = packages.filter((pkg) => {
    const key = iconCacheKey(serial, pkg);
    return !iconCache.has(key) && !iconLoading.has(key);
  });

  for (const packageName of missing.slice(0, 4)) {
    void loadOneIcon(serial, packageName);
  }
}

/**
 * @param {string} serial
 * @param {string} packageName
 */
async function loadOneIcon(serial, packageName) {
  const key = iconCacheKey(serial, packageName);
  if (iconCache.has(key) || iconLoading.has(key)) {
    return iconCache.get(key) ?? null;
  }

  iconLoading.add(key);

  try {
    const iconDataUrl = await runWithAdbLock(
      () => loadPackageIconDataUrl(serial, packageName),
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
async function loadPackageIconDataUrl(serial, packageName) {
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
