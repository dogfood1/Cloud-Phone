import { spawn } from "node:child_process";
import fs from "node:fs/promises";

import { resolveAdbPath } from "../adb-path.js";
import {
  getScrcpyBinaryPath,
  getScrcpyServerJarPath,
  isScrcpyBinaryReady,
} from "../../config/scrcpy-paths.js";
import { writeScrcpyConfigFile, removeScrcpyConfigFile } from "./config-file.js";
import { buildScrcpyCliArgs } from "./cli-args.js";

export async function runScrcpyCapabilities() {
  const binaryPath = getScrcpyBinaryPath();
  const capabilitiesJson = await import("./capabilities-data.js").then(
    (module) => module.SCRCPY_CAPABILITIES,
  );
  const tempJson = await writeCapabilitiesSidecar(capabilitiesJson);

  return new Promise((resolve, reject) => {
    const child = spawn(
      binaryPath,
      ["--cloud-phone-capabilities"],
      {
        env: {
          ...process.env,
          CLOUD_PHONE_SCRCPY_CAPABILITIES: tempJson,
        },
        windowsHide: true,
      },
    );

    let stdout = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", async (code) => {
      await fs.unlink(tempJson).catch(() => undefined);

      if (code !== 0) {
        reject(new Error(`scrcpy capabilities exited with code ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve(capabilitiesJson);
      }
    });
  });
}

async function writeCapabilitiesSidecar(capabilities) {
  const os = await import("node:os");
  const path = await import("node:path");
  const filePath = path.join(
    os.tmpdir(),
    `cloud-phone-scrcpy-capabilities-${process.pid}.json`,
  );

  await fs.writeFile(filePath, `${JSON.stringify(capabilities, null, 2)}\n`, "utf8");
  return filePath;
}

export async function startScrcpyProcess(options = {}) {
  if (!isScrcpyBinaryReady()) {
    throw new Error(
      "scrcpy binary is missing. Build backend/source/scrcpy and install to backend/bin/scrcpy/<platform>/",
    );
  }

  const configPath = await writeScrcpyConfigFile(options);
  const binaryPath = getScrcpyBinaryPath();
  const extraArgs = buildScrcpyCliArgs(options.extraArgs ?? {});
  const args = [`--cloud-phone-config=${configPath}`, ...extraArgs];

  const child = spawn(binaryPath, args, {
    env: {
      ...process.env,
      ANDROID_ADB: resolveAdbPath(),
      SCRCPY_SERVER_PATH: getScrcpyServerJarPath(),
    },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    child,
    configPath,
    pid: child.pid,
    args,
    binaryPath,
  };
}

export async function stopScrcpyProcess(handle) {
  if (!handle?.child || handle.child.killed) {
    await removeScrcpyConfigFile(handle?.configPath);
    return;
  }

  handle.child.kill("SIGTERM");

  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (!handle.child.killed) {
        handle.child.kill("SIGKILL");
      }

      resolve();
    }, 3000);

    handle.child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });

  await removeScrcpyConfigFile(handle.configPath);
}
