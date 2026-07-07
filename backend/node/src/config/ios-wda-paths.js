import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PROJECT_ROOT_PATH } from "./paths.js";

const currentDirPath = path.dirname(fileURLToPath(import.meta.url));

export const WDA_BIN_DIR = path.resolve(PROJECT_ROOT_PATH, "backend", "bin", "wda");
export const WDA_IPA_PATH = path.resolve(WDA_BIN_DIR, "wda.ipa");
export const WDA_CONFIG_PATH = path.resolve(WDA_BIN_DIR, "config.json");
export const WDA_SIGNED_DIR = path.resolve(WDA_BIN_DIR, "signed");
export const WDA_PIPELINE_SCRIPT = path.resolve(PROJECT_ROOT_PATH, "backend", "assets", "ios", "wda_pipeline.py");
export const WDA_REQUIREMENTS = path.resolve(PROJECT_ROOT_PATH, "backend", "assets", "ios", "requirements.txt");

const ZSIGN_CANDIDATES = [
  path.resolve(WDA_BIN_DIR, "zsign.exe"),
  path.resolve(WDA_BIN_DIR, "zsign"),
  path.resolve(WDA_BIN_DIR, "zsign", "zsign.exe"),
  path.resolve(WDA_BIN_DIR, "zsign", "zsign"),
];

export function resolveZsignPath() {
  for (const candidate of ZSIGN_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function readWdaConfig() {
  const fallback = {
    bundleId: "com.facebook.WebDriverAgentRunner.xctrunner",
    httpPort: 8100,
    mjpegPort: 9100,
  };

  try {
    if (!fs.existsSync(WDA_CONFIG_PATH)) {
      return fallback;
    }

    const parsed = JSON.parse(fs.readFileSync(WDA_CONFIG_PATH, "utf8"));
    return {
      bundleId: String(parsed.bundleId ?? fallback.bundleId),
      httpPort: Number(parsed.httpPort ?? fallback.httpPort),
      mjpegPort: Number(parsed.mjpegPort ?? fallback.mjpegPort),
    };
  } catch {
    return fallback;
  }
}

export function getWdaPrepareStatus() {
  return {
    ipaPath: WDA_IPA_PATH,
    ipaExists: fs.existsSync(WDA_IPA_PATH),
    zsignPath: resolveZsignPath(),
    zsignExists: Boolean(resolveZsignPath()),
    pipelineScript: WDA_PIPELINE_SCRIPT,
    pipelineExists: fs.existsSync(WDA_PIPELINE_SCRIPT),
    config: readWdaConfig(),
    signedDir: WDA_SIGNED_DIR,
  };
}
