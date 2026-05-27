import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildToolEnv, requireJavaHomeMessage, resolveJavaHome } from "./scrcpy-build-env.js";
import {
  ensureGradlewExecutable,
  getHostPlatformKey,
  getScrcpyBinDir,
  getScrcpyServerPath,
  SCRCPY_PLATFORM_KEYS,
} from "./scrcpy-platform.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scrcpyRoot = path.join(rootDir, "backend", "source", "scrcpy");
const serverDir = path.join(scrcpyRoot, "server");
const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const installAllPlatforms =
  process.argv.includes("--all-platforms") || process.argv.includes("--all");

function run(command, args, options = {}) {
  if (!resolveJavaHome() && !options.allowMissingJava) {
    throw new Error(requireJavaHomeMessage());
  }

  const result = spawnSync(command, args, {
    cwd: options.cwd ?? scrcpyRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: buildToolEnv(),
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with code ${result.status}`);
  }
}

function readGradleVersionName() {
  const gradlePath = path.join(serverDir, "build.gradle");
  const text = fs.readFileSync(gradlePath, "utf8");
  const match = text.match(/versionName\s+"([^"]+)"/);

  if (!match) {
    throw new Error(`versionName not found in ${gradlePath}`);
  }

  return match[1];
}

function readNodeServerVersion() {
  const pathsFile = path.join(rootDir, "backend", "node", "src", "config", "scrcpy-paths.js");
  const text = fs.readFileSync(pathsFile, "utf8");
  const match = text.match(/SCRCPY_SERVER_VERSION\s*=\s*"([^"]+)"/);

  if (!match) {
    throw new Error(`SCRCPY_SERVER_VERSION not found in ${pathsFile}`);
  }

  return match[1];
}

function assertServerVersionAligned() {
  const gradleVersion = readGradleVersionName();
  const nodeVersion = readNodeServerVersion();

  if (gradleVersion !== nodeVersion) {
    throw new Error(
      `scrcpy server version mismatch: build.gradle "${gradleVersion}" vs scrcpy-paths.js "${nodeVersion}"`,
    );
  }
}

function findBuiltApk() {
  const candidates = [
    path.join(serverDir, "build", "outputs", "apk", "release", "server-release-unsigned.apk"),
    path.join(serverDir, "build", "outputs", "apk", "debug", "server-debug.apk"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

/**
 * @param {string} apkPath
 * @param {{ allPlatforms?: boolean }} [options]
 */
function installServerJar(apkPath, options = {}) {
  const targets = options.allPlatforms
    ? SCRCPY_PLATFORM_KEYS
    : [getHostPlatformKey()];

  for (const platformKey of targets) {
    const binDir = getScrcpyBinDir(rootDir, platformKey);
    const destination = getScrcpyServerPath(rootDir, platformKey);
    fs.mkdirSync(binDir, { recursive: true });
    fs.copyFileSync(apkPath, destination);
    console.log(`Installed scrcpy-server (${platformKey}) -> ${destination}`);
  }
}

/**
 * Build Cloud Phone scrcpy-server (WebSocket / ws-scrcpy wire on official 4.0 base).
 * @param {{ allPlatforms?: boolean }} [options]
 */
export function buildScrcpyServer(options = {}) {
  const gradlewPath = path.join(scrcpyRoot, process.platform === "win32" ? "gradlew.bat" : "gradlew");

  if (!fs.existsSync(gradlewPath)) {
    throw new Error(`Gradle wrapper not found under ${scrcpyRoot}`);
  }

  ensureGradlewExecutable(gradlewPath);
  assertServerVersionAligned();

  const allPlatforms = options.allPlatforms ?? installAllPlatforms;
  console.log(
    `Building Cloud Phone scrcpy-server (Android) from backend/source/scrcpy${allPlatforms ? " [all platforms]" : ""} ...`,
  );

  run(gradlew, [":server:assembleRelease"], { cwd: scrcpyRoot });

  const apkPath = findBuiltApk();

  if (!apkPath) {
    throw new Error("scrcpy-server APK not found after Gradle build");
  }

  installServerJar(apkPath, { allPlatforms });

  return getScrcpyServerPath(rootDir, getHostPlatformKey());
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    buildScrcpyServer({ allPlatforms: installAllPlatforms });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
