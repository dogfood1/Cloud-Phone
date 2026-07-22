import { runAdb } from "./adb-command.js";
import { runWithAdbLock } from "./adb-lock.js";

/**
 * Best-effort check: whether a package still has a visible / resumed activity.
 * Used by multi-app windows to auto-close when the app exits.
 *
 * @param {string} serial
 * @param {string} packageName
 * @returns {Promise<{ running: boolean, pid: number | null, reason: string }>}
 */
export async function getPackageRunningState(serial, packageName) {
  const pkg = String(packageName || "").trim();
  if (!pkg) {
    return { running: false, pid: null, reason: "invalid_package" };
  }

  const [pid, visible] = await Promise.all([
    readPackagePid(serial, pkg),
    hasVisibleActivity(serial, pkg),
  ]);

  if (visible) {
    return { running: true, visible: true, pid, reason: "visible_activity" };
  }

  if (pid) {
    // Process may linger after UI exit — not "running" for multi-app auto-close.
    return { running: false, visible: false, pid, reason: "process_alive" };
  }

  return { running: false, visible: false, pid: null, reason: "not_found" };
}

/**
 * @param {string} serial
 * @param {string} packageName
 */
async function readPackagePid(serial, packageName) {
  try {
    const { stdout } = await runWithAdbLock(
      () =>
        runAdb(["-s", serial, "shell", "pidof", "-s", packageName], {
          timeout: 8_000,
        }),
      { lockKey: serial },
    );
    const raw = String(stdout || "").trim().split(/\s+/)[0];
    const pid = Number.parseInt(raw, 10);
    return Number.isFinite(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} serial
 * @param {string} packageName
 */
async function hasVisibleActivity(serial, packageName) {
  try {
    const { stdout } = await runWithAdbLock(
      () =>
        runAdb(["-s", serial, "shell", "dumpsys", "activity", "activities"], {
          timeout: 20_000,
          maxBuffer: 6 * 1024 * 1024,
        }),
      { lockKey: serial },
    );

    return parsePackageVisibleInActivities(stdout, packageName);
  } catch {
    return false;
  }
}

/**
 * @param {string} stdout
 * @param {string} packageName
 */
export function parsePackageVisibleInActivities(stdout, packageName) {
  const text = String(stdout || "");
  if (!text || !packageName) {
    return false;
  }

  const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const recordRe = new RegExp(
    `ActivityRecord\\{[^\\n]*\\b${escaped}/[^\\n]*`,
    "g",
  );
  const records = text.match(recordRe);
  if (!records?.length) {
    return false;
  }

  // Prefer explicit resumed / visible markers near the package.
  const resumedRe = new RegExp(
    `(?:topResumedActivity|mResumedActivity|ResumedActivity)[^\\n]*\\b${escaped}/`,
    "i",
  );
  if (resumedRe.test(text)) {
    return true;
  }

  const visibleRe = new RegExp(
    `ActivityRecord\\{[^\\n]*\\b${escaped}/[^\\n]*(?:mVisible=true|state=RESUMED|state=STARTED)`,
    "i",
  );
  return visibleRe.test(text);
}
