import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

import { resolveAdbPath } from "./adb-path.js";

const execFileAsync = promisify(execFile);

export function runAdb(args, options = {}) {
  const adbPath = resolveAdbPath();

  return execFileAsync(adbPath, args, {
    windowsHide: true,
    timeout: options.timeout ?? 30_000,
    maxBuffer: options.maxBuffer ?? 8 * 1024 * 1024,
    encoding: options.encoding ?? "utf8",
  });
}

export async function adbPush(serial, localPath, remotePath) {
  await runAdb(["-s", serial, "push", localPath, remotePath], { timeout: 120_000 });
}

export async function adbForward(serial, localPort, socketName) {
  await runAdb(["-s", serial, "forward", `tcp:${localPort}`, `localabstract:${socketName}`]);
}

export async function adbForwardRemove(serial, localPort) {
  try {
    await runAdb(["-s", serial, "forward", "--remove", `tcp:${localPort}`]);
  } catch {
    // ignore if already removed
  }
}

export function spawnAdbShell(serial, command) {
  const adbPath = resolveAdbPath();

  return spawn(adbPath, ["-s", serial, "shell", command], {
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
}
