import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runAdb } from "./adb-command.js";
import { runWithAdbLock } from "./adb-lock.js";
import { setCachedAppIcon } from "./device-app-icons.js";
import {
  ICON_HELPER_SERVICE,
  iconHelperRemotePath,
} from "./icon-helper-paths.js";

/** @type {Map<string, { apps: Array<{ packageName: string, activity: string, label: string, iconFile: string | null }>, expires: number }>} */
const appsSnapshotCache = new Map();

/** @type {Map<string, { phase: string, total: number, done: number, current: string, message: string, updatedAt: number }>} */
const progressCache = new Map();

/** @type {Set<string>} */
const extractInFlight = new Set();

const APPS_TTL_MS = 5 * 60_000;

/**
 * @param {string} serial
 */
export function getCachedHelperApps(serial) {
  const hit = appsSnapshotCache.get(serial);
  if (!hit || hit.expires < Date.now()) {
    return null;
  }
  return hit.apps;
}

/**
 * @param {string} serial
 */
export function getIconHelperProgress(serial) {
  return (
    progressCache.get(serial) ?? {
      phase: "idle",
      total: 0,
      done: 0,
      current: "",
      message: "",
      updatedAt: 0,
    }
  );
}

/**
 * @param {string} serial
 * @param {{ force?: boolean }} [options]
 */
export async function startIconHelperExtract(serial, options = {}) {
  const force = Boolean(options.force);
  const cached = getCachedHelperApps(serial);
  const progress = getIconHelperProgress(serial);

  if (!force && cached?.length && progress.phase === "done") {
    return { started: false, progress, apps: cached };
  }

  if (!force && !cached?.length) {
    const remoteProgress = await readRemoteJson(serial, "progress.json").catch(() => null);
    if (remoteProgress?.phase === "done") {
      const apps = await ingestHelperOutputs(serial).catch(() => []);
      if (apps?.length) {
        progressCache.set(serial, {
          phase: "done",
          total: apps.length,
          done: apps.length,
          current: "",
          message: "cached",
          updatedAt: Date.now(),
        });
        return {
          started: false,
          progress: getIconHelperProgress(serial),
          apps,
        };
      }
    }
  }

  if (extractInFlight.has(serial) || progress.phase === "running") {
    return { started: false, progress, apps: cached };
  }

  extractInFlight.add(serial);
  progressCache.set(serial, {
    phase: "running",
    total: 0,
    done: 0,
    current: "",
    message: "starting",
    updatedAt: Date.now(),
  });

  void runExtractJob(serial).finally(() => {
    extractInFlight.delete(serial);
  });

  return { started: true, progress: getIconHelperProgress(serial), apps: cached };
}

/**
 * Poll device progress.json and refresh cache.
 * @param {string} serial
 */
export async function refreshIconHelperProgress(serial) {
  const remoteProgress = await readRemoteJson(serial, "progress.json").catch(() => null);
  if (remoteProgress && typeof remoteProgress === "object") {
    progressCache.set(serial, {
      phase: String(remoteProgress.phase || "running"),
      total: Number(remoteProgress.total) || 0,
      done: Number(remoteProgress.done) || 0,
      current: String(remoteProgress.current || ""),
      message: String(remoteProgress.message || ""),
      updatedAt: Date.now(),
    });
  }

  const progress = getIconHelperProgress(serial);
  if (progress.phase === "done" && !getCachedHelperApps(serial)) {
    await ingestHelperOutputs(serial);
  }

  return progress;
}

async function runExtractJob(serial) {
  try {
    await runWithAdbLock(async () => {
      try {
        await runAdb(
          [
            "-s",
            serial,
            "shell",
            "am",
            "start-foreground-service",
            "-n",
            ICON_HELPER_SERVICE,
          ],
          { timeout: 20_000 },
        );
      } catch {
        await runAdb(
          [
            "-s",
            serial,
            "shell",
            "am",
            "startservice",
            "-n",
            ICON_HELPER_SERVICE,
          ],
          { timeout: 20_000 },
        );
      }
    }, { lockKey: serial });

    const deadline = Date.now() + 10 * 60_000;
    while (Date.now() < deadline) {
      await sleep(700);
      const progress = await refreshIconHelperProgress(serial);
      if (progress.phase === "done" || progress.phase === "error") {
        break;
      }
    }

    const finalProgress = getIconHelperProgress(serial);
    if (finalProgress.phase === "done") {
      await ingestHelperOutputs(serial);
    } else if (finalProgress.phase !== "error") {
      progressCache.set(serial, {
        ...finalProgress,
        phase: "error",
        message: finalProgress.message || "extract timeout",
        updatedAt: Date.now(),
      });
    }
  } catch (error) {
    progressCache.set(serial, {
      phase: "error",
      total: 0,
      done: 0,
      current: "",
      message: error instanceof Error ? error.message : "extract failed",
      updatedAt: Date.now(),
    });
  }
}

/**
 * @param {string} serial
 */
async function ingestHelperOutputs(serial) {
  const apps = await readRemoteJson(serial, "apps.json");
  if (!Array.isArray(apps)) {
    return [];
  }

  const normalized = [];
  for (const row of apps) {
    const packageName = String(row?.packageName || "").trim();
    if (!packageName) {
      continue;
    }

    const iconFile = row?.iconFile ? String(row.iconFile) : null;
    if (iconFile) {
      const dataUrl = await pullHelperIconDataUrl(serial, iconFile).catch(() => null);
      if (dataUrl) {
        setCachedAppIcon(serial, packageName, dataUrl);
      }
    }

    normalized.push({
      packageName,
      activity: String(row?.activity || ""),
      label: String(row?.label || packageName),
      iconFile,
    });
  }

  appsSnapshotCache.set(serial, {
    apps: normalized,
    expires: Date.now() + APPS_TTL_MS,
  });

  return normalized;
}

/**
 * @param {string} serial
 * @param {string} relative
 */
async function pullHelperIconDataUrl(serial, relative) {
  const remote = iconHelperRemotePath(relative);
  const tmpPath = path.join(
    os.tmpdir(),
    `cloud-phone-helper-icon-${Date.now()}-${Math.random().toString(16).slice(2)}.png`,
  );

  try {
    await runWithAdbLock(
      () => runAdb(["-s", serial, "pull", remote, tmpPath], { timeout: 30_000 }),
      { lockKey: serial },
    );
    const bytes = await fs.readFile(tmpPath);
    if (!bytes.length) {
      return null;
    }
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } finally {
    await fs.unlink(tmpPath).catch(() => undefined);
  }
}

/**
 * @param {string} serial
 * @param {string} relative
 */
async function readRemoteJson(serial, relative) {
  const remote = iconHelperRemotePath(relative);
  const { stdout } = await runWithAdbLock(
    () =>
      runAdb(["-s", serial, "shell", "cat", remote], {
        timeout: 15_000,
        maxBuffer: 8 * 1024 * 1024,
      }),
    { lockKey: serial },
  );

  const text = String(stdout || "").trim();
  if (!text || text.includes("No such file")) {
    return null;
  }

  return JSON.parse(text);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
