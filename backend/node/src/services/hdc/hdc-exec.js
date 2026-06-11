import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { resolveHdcPath } from "../../config/harmony-paths.js";

const execFileAsync = promisify(execFile);

function buildHdcPrefix() {
  const host = process.env.HDC_SERVER_HOST?.trim();
  const port = process.env.HDC_SERVER_PORT?.trim();
  const hdcPath = resolveHdcPath();

  if (host && port) {
    return [hdcPath, "-s", `${host}:${port}`];
  }

  return [hdcPath];
}

/**
 * @param {string[]} args
 * @param {{ serial?: string, timeout?: number, maxBuffer?: number }} [options]
 */
export async function runHdc(args, options = {}) {
  const prefix = buildHdcPrefix();
  const command = [...prefix];

  if (options.serial) {
    command.push("-t", options.serial);
  }

  command.push(...args);

  const { stdout, stderr } = await execFileAsync(command[0], command.slice(1), {
    windowsHide: true,
    timeout: options.timeout ?? 15_000,
    maxBuffer: options.maxBuffer ?? 4 * 1024 * 1024,
  });

  const output = `${stdout ?? ""}${stderr ?? ""}`.trim();

  if (/error:|^\[fail\]/im.test(output)) {
    const error = new Error(output || "HDC command failed.");
    error.code = "hdc_command_failed";
    throw error;
  }

  return {
    stdout: stdout ?? "",
    stderr: stderr ?? "",
    output,
  };
}

export async function listHdcTargets() {
  const { stdout } = await runHdc(["list", "targets"], { timeout: 8000 });

  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/empty/i.test(line));
}
