import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const projectRootPath = path.resolve(currentDirPath, "..", "..", "..", "..");

const HARMONY_ASSETS_DIR = path.resolve(projectRootPath, "backend", "assets", "harmony");

const HDC_EXECUTABLES = {
  win32: ["backend", "bin", "hdc", "windows", "hdc.exe"],
  linux: ["backend", "bin", "hdc", "linux", "hdc"],
  darwin: ["backend", "bin", "hdc", "darwin", "hdc"],
};

const DEVECO_HDC_CANDIDATES = {
  win32: [
    "C:\\Program Files\\Huawei\\DevEco Studio\\sdk\\default\\openharmony\\toolchains\\hdc.exe",
    "C:\\Program Files (x86)\\Huawei\\DevEco Studio\\sdk\\default\\openharmony\\toolchains\\hdc.exe",
  ],
  linux: ["/opt/deveco-studio/sdk/default/openharmony/toolchains/hdc"],
  darwin: ["/Applications/DevEco-Studio.app/Contents/sdk/default/openharmony/toolchains/hdc"],
};

const KNOWN_AGENT_NAMES = [
  "uitest_agent_v1.1.0.so",
  "uitest_agent_v1.1.10.so",
  "agent.so",
];

export const UITEST_SERVICE_PORT = 8012;
export const HARMONY_AGENT_REMOTE_PATH = "/data/local/tmp/agent.so";

function findBundledHarmonyAgent() {
  for (const name of KNOWN_AGENT_NAMES) {
    const candidate = path.join(HARMONY_ASSETS_DIR, name);

    if (existsSync(candidate)) {
      return candidate;
    }
  }

  try {
    const files = readdirSync(HARMONY_ASSETS_DIR);

    for (const file of files) {
      if (!file.endsWith(".so")) {
        continue;
      }

      if (/agent|uitest/i.test(file)) {
        return path.join(HARMONY_ASSETS_DIR, file);
      }
    }
  } catch {
    // ignore
  }

  return null;
}

export function resolveHarmonyAgentPath() {
  const envPath = process.env.HARMONY_AGENT_PATH?.trim();

  if (envPath && existsSync(envPath)) {
    return envPath;
  }

  const bundled = findBundledHarmonyAgent();

  if (bundled) {
    return bundled;
  }

  throw new Error(
    `Harmony uitest agent is missing. Place agent.so or uitest_agent_v1.1.0.so under ${HARMONY_ASSETS_DIR} or set HARMONY_AGENT_PATH.`,
  );
}

export function resolveHdcPath() {
  const envPath = process.env.HDC_PATH?.trim();

  if (envPath && existsSync(envPath)) {
    return envPath;
  }

  const segments = HDC_EXECUTABLES[process.platform];

  if (segments) {
    const bundled = path.resolve(projectRootPath, ...segments);

    if (existsSync(bundled)) {
      return bundled;
    }
  }

  for (const candidate of DEVECO_HDC_CANDIDATES[process.platform] ?? []) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "HDC executable not found. Install DevEco Studio toolchains or place hdc under backend/bin/hdc/<platform>/, or set HDC_PATH.",
  );
}

export function pickHarmonyLocalPort() {
  return 28_000 + Math.floor(Math.random() * 1000);
}
