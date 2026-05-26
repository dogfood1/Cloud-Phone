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

function listProgramFilesJavaHomes() {
  if (process.platform !== "win32") {
    return [];
  }

  const javaRoot = "C:\\Program Files\\Java";
  if (!fs.existsSync(javaRoot)) {
    return [];
  }

  const versionRank = (name) => {
    const match = name.match(/jdk-(\d+)/i);
    return match ? Number(match[1]) : 0;
  };

  return fs
    .readdirSync(javaRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^jdk-/i.test(entry.name))
    .sort((a, b) => versionRank(b.name) - versionRank(a.name))
    .map((entry) => path.join(javaRoot, entry.name));
}

const JAVA_HOME_CANDIDATES = [
  process.env.CLOUD_PHONE_JAVA_HOME,
  process.env.JAVA_HOME,
  ...listProgramFilesJavaHomes(),
  "C:\\Program Files\\Android\\Android Studio\\jbr",
  path.join(process.env.LOCALAPPDATA ?? "", "Programs", "Android", "Android Studio", "jbr"),
].filter(Boolean);

function javaMajorVersion(javaHome) {
  const releaseFile = path.join(javaHome, "release");
  if (!fs.existsSync(releaseFile)) {
    return 0;
  }

  const text = fs.readFileSync(releaseFile, "utf8");
  const match = text.match(/JAVA_VERSION="?(\d+)/);
  return match ? Number(match[1]) : 0;
}

function resolveJavaHome() {
  for (const candidate of JAVA_HOME_CANDIDATES) {
    const javaBin =
      process.platform === "win32"
        ? path.join(candidate, "bin", "java.exe")
        : path.join(candidate, "bin", "java");
    if (!fs.existsSync(javaBin)) {
      continue;
    }

    const major = javaMajorVersion(candidate);
    if (major > 0 && major < 17) {
      continue;
    }

    return candidate;
  }

  return null;
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
  } else if (!options.allowMissingJava) {
    throw new Error(
      "JDK 17+ required. Set CLOUD_PHONE_JAVA_HOME or install JDK 17 under Program Files\\Java",
    );
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
      `scrcpy server version mismatch: build.gradle has "${gradleVersion}", scrcpy-paths.js has "${nodeVersion}"`,
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

export function buildScrcpyServer() {
  if (!fs.existsSync(path.join(scrcpyRoot, gradlew))) {
    throw new Error(`Gradle wrapper not found under ${scrcpyRoot}`);
  }

  fs.mkdirSync(binDir, { recursive: true });
  assertServerVersionAligned();
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
