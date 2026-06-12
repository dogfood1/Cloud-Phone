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
  "uitest_agent_v1.1.9.x86_64_so",
  "uitest_agent_v1.1.0.so",
  "uitest_agent_v1.1.10.so",
  "agent.so",
];

export const HARMONY_ASSETS_DIR_PATH = HARMONY_ASSETS_DIR;

function isAgentAssetName(file) {
  const lower = file.toLowerCase();
  return /agent|uitest/i.test(lower) && (lower.endsWith(".so") || lower.endsWith("_so") || lower.includes("x86_64"));
}

function filenameHintsAbi(file, deviceAbi) {
  const lower = file.toLowerCase();

  if (deviceAbi === "x86_64") {
    return lower.includes("x86_64");
  }

  if (deviceAbi === "arm64") {
    return lower.includes("arm64") || lower.includes("aarch64") || !lower.includes("x86_64");
  }

  return true;
}

function listBundledHarmonyAgents() {
  /** @type {string[]} */
  const paths = [];

  for (const name of KNOWN_AGENT_NAMES) {
    const candidate = path.join(HARMONY_ASSETS_DIR, name);

    if (existsSync(candidate)) {
      paths.push(candidate);
    }
  }

  try {
    const files = readdirSync(HARMONY_ASSETS_DIR);

    for (const file of files) {
      if (!isAgentAssetName(file)) {
        continue;
      }

      const candidate = path.join(HARMONY_ASSETS_DIR, file);

      if (!paths.includes(candidate)) {
        paths.push(candidate);
      }
    }
  } catch {
    // ignore
  }

  return paths;
}

function findBundledHarmonyAgent() {
  return listBundledHarmonyAgents()[0] ?? null;
}

/**
 * @param {string} [deviceAbi]
 * @param {(filePath: string) => Promise<number>} readMachine
 */
export async function resolveHarmonyAgentPathForAbi(deviceAbi, readMachine) {
  const envPath = process.env.HARMONY_AGENT_PATH?.trim();

  if (envPath && existsSync(envPath)) {
    return envPath;
  }

  const candidates = listBundledHarmonyAgents();

  if (candidates.length === 0) {
    throw new Error(
      `Harmony uitest agent is missing. Place agent.so or uitest_agent under ${HARMONY_ASSETS_DIR} or set HARMONY_AGENT_PATH.`,
    );
  }

  if (deviceAbi) {
    for (const candidate of candidates) {
      if (!filenameHintsAbi(path.basename(candidate), deviceAbi)) {
        continue;
      }

      const machine = await readMachine(candidate);

      if (deviceAbi === "x86_64" && machine === 62) {
        return candidate;
      }

      if (deviceAbi === "arm64" && machine === 183) {
        return candidate;
      }
    }

    for (const candidate of candidates) {
      const machine = await readMachine(candidate);

      if (deviceAbi === "x86_64" && machine === 62) {
        return candidate;
      }

      if (deviceAbi === "arm64" && machine === 183) {
        return candidate;
      }
    }

    throw new Error(
      `未找到与设备架构 ${deviceAbi} 匹配的 uitest agent。请将对应 agent 放到 ${HARMONY_ASSETS_DIR}（x86_64 模拟器：uitest_agent_v1.1.9.x86_64_so）。`,
    );
  }

  return findBundledHarmonyAgent() ?? candidates[0];
}

export const UITEST_SERVICE_PORT = 8012;
export const HARMONY_AGENT_REMOTE_PATH = "/data/local/tmp/agent.so";

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
    `Harmony uitest agent is missing. Place agent.so or uitest_agent under ${HARMONY_ASSETS_DIR} or set HARMONY_AGENT_PATH.`,
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
