import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scrcpyRoot = path.join(rootDir, "backend", "source", "scrcpy");
const serverDir = path.join(scrcpyRoot, "server");
const platformKey =
  process.platform === "win32"
    ? "windows"
    : process.platform === "darwin"
      ? "macos"
      : "linux";
const binDir = path.join(rootDir, "backend", "bin", "scrcpy", platformKey);
const serverBinPath = path.join(binDir, "scrcpy-server");
const gradlew = process.platform === "win32" ? "gradlew.bat" : "gradlew";

const JAVA_HOME_CANDIDATES = [
  process.env.JAVA_HOME,
  process.env.CLOUD_PHONE_JAVA_HOME,
  "C:\\Program Files\\Android\\Android Studio\\jbr",
  path.join(process.env.LOCALAPPDATA ?? "", "Programs", "Android", "Android Studio", "jbr"),
].filter(Boolean);

function resolveJavaHome() {
  for (const candidate of JAVA_HOME_CANDIDATES) {
    const javaBin =
      process.platform === "win32"
        ? path.join(candidate, "bin", "java.exe")
        : path.join(candidate, "bin", "java");
    if (fs.existsSync(javaBin)) {
      return candidate;
    }
  }
  return process.env.JAVA_HOME ?? null;
}

function resolveAndroidHome() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk"),
    path.join(process.env.USERPROFILE ?? "", "AppData", "Local", "Android", "Sdk"),
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function run(command, args, options = {}) {
  const env = { ...process.env };
  const javaHome = resolveJavaHome();
  if (javaHome) {
    env.JAVA_HOME = javaHome;
  }
  const androidHome = resolveAndroidHome();
  if (androidHome) {
    env.ANDROID_HOME = androidHome;
    env.ANDROID_SDK_ROOT = androidHome;
  }

  const result = spawnSync(command, args, {
    cwd: options.cwd ?? scrcpyRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with code ${result.status}`);
  }
}

function findBuiltApk() {
  const candidates = [
    path.join(serverDir, "build", "outputs", "apk", "release", "server-release-unsigned.apk"),
    path.join(serverDir, "build", "outputs", "apk", "debug", "server-debug.apk"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

export function buildScrcpyServer() {
  if (!fs.existsSync(path.join(scrcpyRoot, gradlew))) {
    throw new Error(`Gradle wrapper not found under ${scrcpyRoot}`);
  }

  fs.mkdirSync(binDir, { recursive: true });
  console.log("Building scrcpy-server (Android) from backend/source/scrcpy ...");
  run(path.join(scrcpyRoot, gradlew), [":server:assembleRelease"], { cwd: scrcpyRoot });

  const apkPath = findBuiltApk();
  if (!apkPath) {
    throw new Error("scrcpy-server APK not found after Gradle build");
  }

  fs.copyFileSync(apkPath, serverBinPath);
  console.log(`Installed scrcpy-server to ${serverBinPath}`);
  return serverBinPath;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    buildScrcpyServer();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
