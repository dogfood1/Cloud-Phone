import { runAdb } from "./adb-command.js";
import { runWithAdbLock } from "./adb-lock.js";
import { fetchScrcpyAppLabels } from "./device-apps-scrcpy-labels.js";
import {
  getCachedAppIcon,
  loadMissingAppIcons,
  warmupMissingAppIcons,
} from "./device-app-icons.js";

/** @type {Map<string, { expires: number, apps: Array<{ packageName: string, activity: string, label: string }> }>} */
const launcherCache = new Map();
const CACHE_TTL_MS = 60_000;

/**
 * @param {string} serial
 * @param {{ light?: boolean }} [options]
 * @returns {Promise<Array<{
 *   packageName: string,
 *   activity: string,
 *   label: string,
 *   iconDataUrl: string | null,
 * }>>}
 */
export async function listLauncherApps(serial, options = {}) {
  const light = Boolean(options.light);
  const apps = await resolveLauncherApps(serial);
  const packages = apps.map((item) => item.packageName);

  if (light) {
    warmupMissingAppIcons(serial, packages, 6);
  } else {
    await loadMissingAppIcons(serial, packages);
  }

  return apps.map((item) => ({
    ...item,
    iconDataUrl: getCachedAppIcon(serial, item.packageName),
  }));
}

/**
 * @param {string} serial
 */
async function resolveLauncherApps(serial) {
  const cached = launcherCache.get(serial);
  if (cached && cached.expires > Date.now()) {
    return cached.apps;
  }

  const [entries, labels] = await Promise.all([
    runWithAdbLock(() => queryLauncherActivities(serial), { lockKey: serial }),
    fetchScrcpyAppLabels(serial).catch(() => new Map()),
  ]);

  const byPackage = new Map();
  for (const entry of entries) {
    if (byPackage.has(entry.packageName)) {
      continue;
    }

    byPackage.set(entry.packageName, {
      packageName: entry.packageName,
      activity: entry.activity,
      label: labels.get(entry.packageName)?.label ?? entry.packageName,
    });
  }

  const apps = [...byPackage.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "zh-CN") || a.packageName.localeCompare(b.packageName),
  );

  launcherCache.set(serial, {
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
