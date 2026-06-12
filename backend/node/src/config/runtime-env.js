import { existsSync } from "node:fs";
import os from "node:os";

/** Cloud Phone backend runs inside Termux (Android userland Linux). */
export function isTermux() {
  return Boolean(process.env.TERMUX_VERSION?.trim());
}

export function isAndroidLinuxHost() {
  return process.platform === "linux" && (isTermux() || os.release().toLowerCase().includes("android"));
}

export function getHostRuntime() {
  if (isTermux()) {
    return "termux";
  }

  if (isAndroidLinuxHost()) {
    return "android-linux";
  }

  return process.platform;
}

export function getHostRuntimeLabel() {
  if (isTermux()) {
    return "Android (Termux)";
  }

  if (isAndroidLinuxHost()) {
    return "Android (Linux)";
  }

  switch (process.platform) {
    case "win32":
      return "Windows";
    case "darwin":
      return "macOS";
    case "linux":
      return "Linux";
    default:
      return process.platform;
  }
}

export function getHostRuntimeInfo() {
  return {
    runtime: getHostRuntime(),
    label: getHostRuntimeLabel(),
    platform: process.platform,
    arch: process.arch,
    termuxVersion: process.env.TERMUX_VERSION ?? null,
  };
}

/**
 * @param {string[]} candidates
 */
export function firstExistingPath(candidates) {
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}
