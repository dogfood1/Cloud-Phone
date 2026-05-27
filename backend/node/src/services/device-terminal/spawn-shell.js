import { spawn } from "node:child_process";

import { resolveAdbPath } from "../adb-path.js";

/**
 * Spawn an interactive adb shell with a pseudo-TTY when supported (`-tt`).
 * @param {string} serial
 */
export function spawnInteractiveAdbShell(serial) {
  const adbPath = resolveAdbPath();

  return spawn(adbPath, ["-s", serial, "shell", "-tt"], {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
}

/**
 * @param {import("node:child_process").ChildProcessWithoutNullStreams} shell
 */
export function writeShellInit(shell) {
  if (!shell.stdin.writable) {
    return;
  }

  shell.stdin.write("export TERM=xterm-256color COLORTERM=truecolor LANG=C.UTF-8\n");
}

/**
 * @param {import("node:child_process").ChildProcessWithoutNullStreams} shell
 * @param {number} cols
 * @param {number} rows
 */
export function writeShellResize(shell, cols, rows) {
  if (!shell.stdin.writable || cols < 1 || rows < 1) {
    return;
  }

  shell.stdin.write(`stty cols ${Math.floor(cols)} rows ${Math.floor(rows)} 2>/dev/null\n`);
}
