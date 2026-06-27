import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { firstExistingPath, isTermux } from "../config/runtime-env.js";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const projectRootPath = path.resolve(currentDirPath, "..", "..", "..", "..");

const ADB_EXECUTABLES = {
  win32: ["backend", "bin", "adb", "platform-tools-latest-windows", "platform-tools", "adb.exe"],
  linux: ["backend", "bin", "adb", "platform-tools-latest-linux", "platform-tools", "adb"],
  darwin: ["backend", "bin", "adb", "platform-tools-latest-darwin", "platform-tools", "adb"],
};

function bundledAdbPath(platform = process.platform) {
  const adbSegments = ADB_EXECUTABLES[platform];

  if (!adbSegments) {
    return null;
  }

  return path.resolve(projectRootPath, ...adbSegments);
}

function isBundledAdbPath(candidate) {
  const normalized = path.normalize(candidate);
  const bundledRoot = path.normalize(path.join(projectRootPath, "backend", "bin", "adb"));

  return normalized.startsWith(bundledRoot);
}

function ensureExecutable(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    try {
      fs.chmodSync(filePath, 0o755);
      fs.accessSync(filePath, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }
}

function prepareAdbCandidate(candidate) {
  if (!candidate || !fs.existsSync(candidate)) {
    return null;
  }

  if (isBundledAdbPath(candidate) && !ensureExecutable(candidate)) {
    return null;
  }

  try {
    fs.accessSync(candidate, fs.constants.X_OK);
    return candidate;
  } catch {
    return null;
  }
}

function preferSystemAdb() {
  const override = process.env.CLOUD_PHONE_PREFER_SYSTEM_ADB?.trim();

  if (override === "1") {
    return true;
  }

  if (override === "0") {
    return false;
  }

  return process.platform === "linux" && fs.existsSync("/.dockerenv");
}

function termuxAdbCandidates() {
  const prefix = process.env.TERMUX_PREFIX?.trim() || "/data/data/com.termux/files/usr";

  return [
    path.join(prefix, "bin", "adb"),
    "/data/data/com.termux/files/usr/bin/adb",
  ];
}

function resolveAdbFromPath() {
  try {
    const command = process.platform === "win32" ? "where" : "which";
    const output = execFileSync(command, ["adb"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const candidate = output.split(/\r?\n/).map((line) => line.trim()).find(Boolean);

    return candidate && firstExistingPath([candidate]);
  } catch {
    return null;
  }
}

export function listAdbPathCandidates() {
  const configured =
    process.env.CLOUD_PHONE_ADB_PATH?.trim() || process.env.ADB_PATH?.trim() || null;
  const candidates = [];
  const fromPath = resolveAdbFromPath();
  const bundled = bundledAdbPath(process.platform) ?? bundledAdbPath("linux");
  const useSystemFirst = preferSystemAdb();

  if (configured) {
    candidates.push(configured);
  }

  if (isTermux()) {
    candidates.push(...termuxAdbCandidates());
  }

  if (useSystemFirst && fromPath) {
    candidates.push(fromPath);
  }

  if (bundled) {
    candidates.push(bundled);
  }

  if (!useSystemFirst && fromPath) {
    candidates.push(fromPath);
  }

  return [...new Set(candidates)];
}

export function resolveAdbPath() {
  for (const candidate of listAdbPathCandidates()) {
    const prepared = prepareAdbCandidate(candidate);

    if (prepared) {
      return prepared;
    }
  }

  if (isTermux()) {
    throw new Error(
      "Termux 未找到 adb。请执行: pkg install android-tools，或设置 CLOUD_PHONE_ADB_PATH。",
    );
  }

  if (fs.existsSync("/.dockerenv")) {
    throw new Error(
      "Docker 未找到可执行的 adb。请重建后端镜像（已预装 android-tools-adb），或设置 CLOUD_PHONE_ADB_PATH。",
    );
  }

  throw new Error(`Unsupported platform or missing bundled adb: ${process.platform}`);
}
