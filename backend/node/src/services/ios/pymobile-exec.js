import { spawn } from "node:child_process";
import fs from "node:fs";

import { WDA_REQUIREMENTS } from "../../config/ios-wda-paths.js";

function resolvePythonCommand() {
  const override = process.env.CLOUD_PHONE_PYTHON?.trim();

  if (override) {
    return override;
  }

  if (process.platform === "win32") {
    return "python";
  }

  return "python3";
}

export function getPythonCommand() {
  return resolvePythonCommand();
}

export async function runPythonModule(args, { timeoutMs = 120_000, env = {} } = {}) {
  const python = resolvePythonCommand();

  return new Promise((resolve, reject) => {
    const child = spawn(python, args, {
      env: { ...process.env, ...env },
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Python command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

export async function checkPythonRuntime() {
  try {
    const result = await runPythonModule(["--version"], { timeoutMs: 10_000 });
    const version = result.stdout.trim() || result.stderr.trim();

    return {
      ok: result.code === 0,
      command: getPythonCommand(),
      version,
      error: result.code === 0 ? null : result.stderr.trim() || "python_not_found",
    };
  } catch (error) {
    return {
      ok: false,
      command: getPythonCommand(),
      version: null,
      error: error instanceof Error ? error.message : "python_not_found",
    };
  }
}

export async function checkPymobiledevice3() {
  const result = await runPythonModule(["-m", "pymobiledevice3", "version"], { timeoutMs: 20_000 });

  return {
    ok: result.code === 0,
    version: result.stdout.trim() || result.stderr.trim(),
    error: result.code === 0 ? null : result.stderr.trim() || result.stdout.trim(),
  };
}

export function getIosPythonHints() {
  const requirements = fs.existsSync(WDA_REQUIREMENTS) ? WDA_REQUIREMENTS : null;

  return {
    pythonCommand: getPythonCommand(),
    requirementsPath: requirements,
    installHint: requirements
      ? `${getPythonCommand()} -m pip install -r "${requirements}"`
      : `${getPythonCommand()} -m pip install pymobiledevice3 requests srp cryptography`,
  };
}
