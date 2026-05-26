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
  try {
    await runAdb(["-s", serial, "forward", "--remove", `tcp:${localPort}`]);
  } catch {
    // ignore
  }

  await runAdb(["-s", serial, "forward", `tcp:${localPort}`, `localabstract:${socketName}`]);
}

export async function adbForwardTcp(serial, localPort, remotePort) {
  try {
    await runAdb(["-s", serial, "forward", "--remove", `tcp:${localPort}`]);
  } catch {
    // ignore
  }

  await runAdb(["-s", serial, "forward", `tcp:${localPort}`, `tcp:${remotePort}`]);
}

export async function listAdbForward(serial) {
  try {
    const { stdout } = await runAdb(["-s", serial, "forward", "--list"]);
    return stdout.trim();
  } catch {
    return "";
  }
}

export async function clearDeviceTunnels(serial) {
  try {
    await runAdb(["-s", serial, "forward", "--remove-all"]);
  } catch {
    // ignore
  }

  try {
    await runAdb(["-s", serial, "reverse", "--remove-all"]);
  } catch {
    // ignore
  }
}

export async function adbForwardRemove(serial, localPort) {
  try {
    await runAdb(["-s", serial, "forward", "--remove", `tcp:${localPort}`]);
  } catch {
    // ignore if already removed
  }
}

export async function adbReverse(serial, localPort, socketName) {
  try {
    await runAdb(["-s", serial, "reverse", "--remove", `tcp:${localPort}`]);
  } catch {
    // ignore stale rule
  }

  await runAdb(["-s", serial, "reverse", `tcp:${localPort}`, `localabstract:${socketName}`]);
}

export async function listAdbReverse(serial) {
  try {
    const { stdout } = await runAdb(["-s", serial, "reverse", "--list"]);
    return stdout.trim();
  } catch {
    return "";
  }
}

export async function adbReverseRemove(serial, localPort) {
  try {
    await runAdb(["-s", serial, "reverse", "--remove", `tcp:${localPort}`]);
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

/**
 * One-shot remote command; avoids blocking behind a long-lived `adb shell` (e.g. web cast).
 * @param {string} serial
 * @param {string} remoteCommand
 * @param {object} [options]
 */
export async function adbExecOut(serial, remoteCommand, options = {}) {
  return runAdb(["-s", serial, "exec-out", remoteCommand], options);
}
