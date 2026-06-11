import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const projectRootPath = path.resolve(currentDirPath, "..", "..", "..", "..");

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

export const UITEST_SERVICE_PORT = 8012;
export const HARMONY_AGENT_REMOTE_PATH = "/data/local/tmp/agent.so";

export function resolveHarmonyAgentPath() {
  const envPath = process.env.HARMONY_AGENT_PATH?.trim();

  if (envPath && existsSync(envPath)) {
    return envPath;
  }

  const bundled = path.resolve(
    projectRootPath,
    "backend",
    "assets",
    "harmony",
    "uitest_agent_v1.1.10.so",
  );

  if (existsSync(bundled)) {
    return bundled;
  }

  throw new Error(
    "Harmony uitest agent is missing. Place uitest_agent_v1.1.0.so under backend/assets/harmony/ or set HARMONY_AGENT_PATH.",
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
