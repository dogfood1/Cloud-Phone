import { runAdb } from "./adb-command.js";
import { runWithAdbLock } from "./adb-lock.js";
import {
  getCachedAppIcon,
  loadMissingAppIcons,
  warmupMissingAppIcons,
} from "./device-app-icons.js";
import {
  fingerprintHelperApps,
  getCachedHelperApps,
  getCachedHelperFingerprint,
} from "./icon-helper-cache.js";

/** @type {Map<string, { expires: number, apps: Array<{ packageName: string, activity: string, label: string }> }>} */
const launcherCache = new Map();
const CACHE_TTL_MS = 60_000;

/**
 * @param {string} serial
 */
export function invalidateLauncherAppsCache(serial) {
  for (const key of [...launcherCache.keys()]) {
    if (key.startsWith(`${serial}::`)) {
      launcherCache.delete(key);
    }
  }
}

/**
 * @param {string} serial
 * @param {{ light?: boolean, packageNamesOnly?: boolean }} [options]
 * @returns {Promise<{
 *   apps: Array<{
 *     packageName: string,
 *     activity: string,
 *     label: string,
 *     iconDataUrl: string | null,
 *   }>,
 *   fingerprint: string,
 * }>}
 */
export async function listLauncherApps(serial, options = {}) {
  const light = Boolean(options.light);
  const packageNamesOnly = Boolean(options.packageNamesOnly);
  const apps = await resolveLauncherApps(serial, { packageNamesOnly });
  const packages = apps.map((item) => item.packageName);

  if (!packageNamesOnly) {
    if (light) {
      warmupMissingAppIcons(serial, packages, 6);
    } else {
      await loadMissingAppIcons(serial, packages);
    }
  }

  const fingerprint = packageNamesOnly
    ? ""
    : getCachedHelperFingerprint(serial) || fingerprintHelperApps(apps);

  return {
    fingerprint,
    apps: apps.map((item) => ({
      ...item,
      iconDataUrl: packageNamesOnly ? null : getCachedAppIcon(serial, item.packageName),
    })),
  };
}

/**
 * @param {string} serial
 * @param {{ packageNamesOnly?: boolean }} [options]
 */
async function resolveLauncherApps(serial, options = {}) {
  const packageNamesOnly = Boolean(options.packageNamesOnly);
  const cacheKey = `${serial}::${packageNamesOnly ? "pkg" : "full"}`;
  const cached = launcherCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.apps;
  }

  const helperApps = !packageNamesOnly ? getCachedHelperApps(serial) : null;
  if (helperApps?.length) {
    const apps = helperApps
      .map((item) => ({
        packageName: item.packageName,
        activity: item.activity,
        label: item.label || item.packageName,
      }))
      .sort(
        (a, b) =>
          a.label.localeCompare(b.label, "zh-CN") ||
          a.packageName.localeCompare(b.packageName),
      );

    launcherCache.set(cacheKey, {
      expires: Date.now() + CACHE_TTL_MS,
      apps,
    });
    return apps;
  }

  const entries = await runWithAdbLock(() => queryLauncherActivities(serial), {
    lockKey: serial,
  });

  const byPackage = new Map();
  for (const entry of entries) {
    if (byPackage.has(entry.packageName)) {
      continue;
    }

    byPackage.set(entry.packageName, {
      packageName: entry.packageName,
      activity: entry.activity,
      label: entry.packageName,
    });
  }

  const apps = [...byPackage.values()].sort((a, b) =>
    a.packageName.localeCompare(b.packageName),
  );

  launcherCache.set(cacheKey, {
    expires: Date.now() + CACHE_TTL_MS,
    apps,
  });

  return apps;
}

/**
 * @param {string} serial
 * @returns {Promise<Array<{ packageName: string, activity: string }>>}
 */
async function queryLauncherActivities(serial) {
  const { stdout } = await runAdb(
    [
      "-s",
      serial,
      "shell",
      "cmd",
      "package",
      "query-activities",
      "--brief",
      "-a",
      "android.intent.action.MAIN",
      "-c",
      "android.intent.category.LAUNCHER",
    ],
    { timeout: 30_000, maxBuffer: 4 * 1024 * 1024 },
  );

  return parseLauncherActivities(stdout);
}

/**
 * @param {string} stdout
 * @returns {Array<{ packageName: string, activity: string }>}
 */
export function parseLauncherActivities(stdout) {
  const rows = [];

  for (const rawLine of String(stdout || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.includes("activities found") || line.startsWith("Activity #")) {
      continue;
    }

    if (line.startsWith("priority=") || line.startsWith("preferredOrder=")) {
      continue;
    }

    const match = line.match(/^([a-zA-Z][\w.]*)\/(\.?[\w.]+)$/);
    if (!match) {
      continue;
    }

    const packageName = match[1];
    const activityRelative = match[2];
    const activity = activityRelative.startsWith(".")
      ? `${packageName}${activityRelative}`
      : activityRelative.includes(".")
        ? activityRelative
        : `${packageName}.${activityRelative}`;

    rows.push({ packageName, activity });
  }

  return rows;
}
