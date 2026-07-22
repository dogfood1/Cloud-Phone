import { parseNotificationDump } from "./device-notifications-parse.js";
import { runAdb } from "./adb-command.js";
import { runWithAdbLock } from "./adb-lock.js";
import { fetchScrcpyAppLabels } from "./device-apps-scrcpy-labels.js";
import {
  getCachedAppIcon,
  loadMissingAppIcons,
  warmupMissingAppIcons,
} from "./device-app-icons.js";

/** @type {Map<string, Map<string, { label: string, system: boolean }>>} */
const labelSnapshot = new Map();

/**
 * @param {string} serial
 * @param {{ light?: boolean }} [options]
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
    warmupMissingAppIcons(serial, packages, 4);
  } else {
    await loadMissingAppIcons(serial, packages);
  }

  const rows = parsed.map((item) => ({
    ...item,
    appLabel: labels.get(item.packageName)?.label ?? item.packageName,
    iconDataUrl: getCachedAppIcon(serial, item.packageName),
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
