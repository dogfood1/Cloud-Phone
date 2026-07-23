import { runAdb } from "./adb-command.js";
import { runWithAdbLock } from "./adb-lock.js";

/**
 * Best-effort check: whether a package still has a visible / resumed activity.
 * Used by multi-app windows to auto-close when the app exits.
 *
 * Important: ADB / dumpsys failures must NOT be reported as "not running"
 * (that falsely closes windows during resize / cast/start lock contention).
 *
 * @param {string} serial
 * @param {string} packageName
 * @returns {Promise<{ running: boolean | null, pid: number | null, reason: string, uncertain?: boolean }>}
 */
export async function getPackageRunningState(serial, packageName) {
  const pkg = String(packageName || "").trim();
  if (!pkg) {
    return { running: false, pid: null, reason: "invalid_package" };
  }

  let pid = null;
  let visible = null;
  let checkFailed = false;

  try {
    pid = await readPackagePid(serial, pkg);
  } catch {
    checkFailed = true;
  }

  try {
    visible = await hasVisibleActivity(serial, pkg);
  } catch {
    checkFailed = true;
    visible = null;
  }

  if (visible === true) {
    return { running: true, visible: true, pid, reason: "visible_activity" };
  }

  if (checkFailed || visible === null) {
    // Keep the window open when we cannot tell — e.g. adb lock during resize.
    return {
      running: null,
      visible: null,
      pid,
      uncertain: true,
      reason: "check_failed",
    };
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
}

/**
 * @param {string} serial
 * @param {string} packageName
 * @returns {Promise<boolean>}
 */
async function hasVisibleActivity(serial, packageName) {
  const { stdout } = await runWithAdbLock(
    () =>
      runAdb(["-s", serial, "shell", "dumpsys", "activity", "activities"], {
        timeout: 20_000,
        maxBuffer: 6 * 1024 * 1024,
      }),
    { lockKey: serial },
  );

  return parsePackageVisibleInActivities(stdout, packageName);
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
    `ActivityRecord\\{[^\\n]*\\b${escaped}/[^\\n]*(?:mVisible=true|isVisible=true|state=RESUMED|state=STARTED)`,
    "i",
  );
  if (visibleRe.test(text)) {
    return true;
  }

  // Apps on scrcpy virtual displays often sit on displayId>0 without mVisible on
  // the same ActivityRecord line — still treat as running for multi-app windows.
  for (const record of records) {
    if (/finishing=true|state=DESTROYED/i.test(record)) {
      continue;
    }
    if (/display(?:Id)?=([1-9]\d*)/i.test(record)) {
      return true;
    }
    if (/state=(?:RESUMED|STARTED|PAUSED|STOPPED)/i.test(record)) {
      return true;
    }
  }

  return false;
}
