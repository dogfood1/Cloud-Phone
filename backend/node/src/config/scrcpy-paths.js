import fs from "node:fs";
import path from "node:path";

import { PROJECT_ROOT_PATH } from "./paths.js";

const SCRCPY_SOURCE_ROOT = path.join(PROJECT_ROOT_PATH, "backend", "source", "scrcpy");
const SCRCPY_BIN_ROOT = path.join(PROJECT_ROOT_PATH, "backend", "bin", "scrcpy");

const PLATFORM_DIR = {
  win32: "windows",
  darwin: "macos",
  linux: "linux",
};

export function getScrcpyPlatformKey() {
  return PLATFORM_DIR[process.platform] ?? process.platform;
}

export function getScrcpySourceRoot() {
  return SCRCPY_SOURCE_ROOT;
}

export function getScrcpyBinaryPath() {
  const platformKey = getScrcpyPlatformKey();
  const binaryName = process.platform === "win32" ? "scrcpy.exe" : "scrcpy";
  const configured = process.env.CLOUD_PHONE_SCRCPY_BIN;

  if (configured) {
    return path.resolve(configured);
  }

  return path.join(SCRCPY_BIN_ROOT, platformKey, binaryName);
}

export function getScrcpyServerJarPath() {
  const platformKey = getScrcpyPlatformKey();
  const configured = process.env.CLOUD_PHONE_SCRCPY_SERVER_JAR;

  if (configured) {
    return path.resolve(configured);
  }

  return path.join(SCRCPY_BIN_ROOT, platformKey, "scrcpy-server");
}

export function isScrcpyBinaryReady() {
  return fs.existsSync(getScrcpyBinaryPath());
}
