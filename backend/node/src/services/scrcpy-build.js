import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { getScrcpyServerJarPath, isScrcpyServerReady } from "../config/scrcpy-paths.js";
import { PROJECT_ROOT_PATH } from "../config/paths.js";

const buildScriptPath = path.join(PROJECT_ROOT_PATH, "tools", "build-scrcpy-server.mjs");
let buildPromise = null;

function runBuildScript() {
  const result = spawnSync(process.execPath, [buildScriptPath], {
    cwd: PROJECT_ROOT_PATH,
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error("scrcpy-server build failed (see logs above)");
  }
}

/**
 * Ensure custom scrcpy-server exists; compile from backend/source/scrcpy when missing.
 */
export async function ensureScrcpyServerBuilt() {
  if (isScrcpyServerReady()) {
    return getScrcpyServerJarPath();
  }

  if (!fs.existsSync(buildScriptPath)) {
    throw new Error(`Missing build script: ${buildScriptPath}`);
  }

  if (!buildPromise) {
    buildPromise = Promise.resolve().then(() => {
      runBuildScript();
      if (!isScrcpyServerReady()) {
        throw new Error(`scrcpy-server still missing after build: ${getScrcpyServerJarPath()}`);
      }
      return getScrcpyServerJarPath();
    }).finally(() => {
      buildPromise = null;
    });
  }

  return buildPromise;
}
