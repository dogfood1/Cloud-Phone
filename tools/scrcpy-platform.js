import fs from "node:fs";
import path from "node:path";

/** @typedef {"windows" | "linux" | "macos"} ScrcpyPlatformKey */

export const SCRCPY_PLATFORM_KEYS = /** @type {const} */ (["windows", "linux", "macos"]);

/**
 * @param {NodeJS.Platform} [platform]
 * @returns {ScrcpyPlatformKey}
 */
export function getHostPlatformKey(platform = process.platform) {
  if (platform === "win32") {
    return "windows";
  }

  if (platform === "darwin") {
    return "macos";
  }

  return "linux";
}

/**
 * @param {string} rootDir
 * @param {ScrcpyPlatformKey} platformKey
 */
export function getScrcpyBinDir(rootDir, platformKey = getHostPlatformKey()) {
  return path.join(rootDir, "backend", "bin", "scrcpy", platformKey);
}

/**
 * @param {ScrcpyPlatformKey} platformKey
 */
export function getScrcpyBinaryName(platformKey) {
  return platformKey === "windows" ? "scrcpy.exe" : "scrcpy";
}

/**
 * @param {string} rootDir
 * @param {ScrcpyPlatformKey} platformKey
 */
export function getScrcpyBinaryPath(rootDir, platformKey) {
  return path.join(getScrcpyBinDir(rootDir, platformKey), getScrcpyBinaryName(platformKey));
}

/**
 * @param {string} rootDir
 * @param {ScrcpyPlatformKey} platformKey
 */
export function getScrcpyServerPath(rootDir, platformKey) {
  return path.join(getScrcpyBinDir(rootDir, platformKey), "scrcpy-server");
}

/**
 * @param {string} gradlewPath
 */
export function ensureGradlewExecutable(gradlewPath) {
  if (process.platform === "win32" || !fs.existsSync(gradlewPath)) {
    return;
  }

  try {
    const mode = fs.statSync(gradlewPath).mode;

    if ((mode & 0o111) === 0) {
      fs.chmodSync(gradlewPath, mode | 0o755);
    }
  } catch {
    // ignore chmod errors
  }
}
