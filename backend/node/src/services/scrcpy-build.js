import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { isAndroidLinuxHost, isTermux } from "../config/runtime-env.js";
import {
  getScrcpyServerDiagnostics,
  getScrcpyServerJarPath,
  isScrcpyServerReady,
} from "../config/scrcpy-paths.js";
import { PROJECT_ROOT_PATH } from "../config/paths.js";

const buildScriptPath = path.join(PROJECT_ROOT_PATH, "tools", "build-scrcpy-server.mjs");
let buildPromise = null;

function termuxServerMissingMessage() {
  const diagnostics = getScrcpyServerDiagnostics();

  return (
    "未找到魔改 scrcpy-server。" +
    `已解析路径: ${diagnostics.resolvedPath ?? "无"}；` +
    `期望默认: ${diagnostics.expectedPath}；` +
    `PROJECT_ROOT: ${diagnostics.projectRoot}；` +
    `cwd: ${diagnostics.cwd}。` +
    "请确认 backend/bin/scrcpy/linux/scrcpy-server 存在，或设置 CLOUD_PHONE_SCRCPY_SERVER_JAR / CLOUD_PHONE_ROOT。"
  );
}

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

  if (isTermux() || isAndroidLinuxHost()) {
    throw new Error(termuxServerMissingMessage());
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
