import fs from "node:fs";
import path from "node:path";

function javaMajorVersion(javaHome) {
  const releaseFile = path.join(javaHome, "release");

  if (!fs.existsSync(releaseFile)) {
    return 0;
  }

  const text = fs.readFileSync(releaseFile, "utf8");
  const match = text.match(/JAVA_VERSION="?(\d+)/);
  return match ? Number(match[1]) : 0;
}

function javaExecutable(javaHome) {
  const name = process.platform === "win32" ? "java.exe" : "java";
  return path.join(javaHome, "bin", name);
}

function listWindowsJavaHomes() {
  const roots = [
    "C:\\Program Files\\Java",
    "C:\\Program Files (x86)\\Java",
    "C:\\Program Files\\Eclipse Adoptium",
    "C:\\Program Files\\Microsoft",
  ];

  const found = [];

  for (const root of roots) {
    if (!fs.existsSync(root)) {
      continue;
    }

    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }

      found.push(path.join(root, entry.name));
    }
  }

  return found.sort((a, b) => javaMajorVersion(b) - javaMajorVersion(a));
}

function listMacJavaHomes() {
  const candidates = [
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home",
    path.join(process.env.HOME ?? "", "Library/Java/JavaVirtualMachines"),
  ];

  const found = [];

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) {
      continue;
    }

    if (candidate.endsWith("JavaVirtualMachines")) {
      for (const entry of fs.readdirSync(candidate, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          found.push(path.join(candidate, entry.name, "Contents/Home"));
        }
      }
      continue;
    }

    found.push(candidate);
  }

  return found;
}

function listLinuxJavaHomes() {
  const found = [];
  const jvmRoot = "/usr/lib/jvm";

  if (fs.existsSync(jvmRoot)) {
    for (const entry of fs.readdirSync(jvmRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        found.push(path.join(jvmRoot, entry.name));
      }
    }
  }

  return found.sort((a, b) => javaMajorVersion(b) - javaMajorVersion(a));
}

/**
 * Resolve JDK 17+ for Gradle (Android server build).
 * @returns {string | null}
 */
export function resolveJavaHome() {
  const candidates = [
    process.env.CLOUD_PHONE_JAVA_HOME,
    process.env.JAVA_HOME,
    ...(process.platform === "win32"
      ? listWindowsJavaHomes()
      : process.platform === "darwin"
        ? listMacJavaHomes()
        : listLinuxJavaHomes()),
    ...(process.platform === "win32"
      ? [
          "C:\\Program Files\\Android\\Android Studio\\jbr",
          path.join(process.env.LOCALAPPDATA ?? "", "Programs", "Android", "Android Studio", "jbr"),
        ]
      : []),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (!fs.existsSync(javaExecutable(candidate))) {
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

/**
 * @returns {string | null}
 */
export function resolveAndroidHome() {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";

  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(home, "Android", "Sdk"),
    path.join(home, ".android", "sdk"),
    path.join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk"),
    path.join(process.env.USERPROFILE ?? "", "AppData", "Local", "Android", "Sdk"),
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

/**
 * @param {Record<string, string | undefined>} [extra]
 */
export function buildToolEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  const javaHome = resolveJavaHome();

  if (javaHome) {
    env.JAVA_HOME = javaHome;
  }

  const androidHome = resolveAndroidHome();

  if (androidHome) {
    env.ANDROID_HOME = androidHome;
    env.ANDROID_SDK_ROOT = androidHome;
  }

  return env;
}

/**
 * @returns {string}
 */
export function requireJavaHomeMessage() {
  if (process.platform === "win32") {
    return "需要 JDK 17+。请设置 CLOUD_PHONE_JAVA_HOME 或安装 JDK 17（Program Files\\Java）。";
  }

  if (process.platform === "darwin") {
    return "需要 JDK 17+。请设置 CLOUD_PHONE_JAVA_HOME、JAVA_HOME，或安装 Android Studio / Temurin 17。";
  }

  return "需要 JDK 17+。请设置 CLOUD_PHONE_JAVA_HOME、JAVA_HOME，或安装 openjdk-17-jdk / Android Studio。";
}
