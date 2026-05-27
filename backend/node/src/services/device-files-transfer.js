import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runAdb } from "./adb-command.js";
import { runWithAdbLock } from "./adb-lock.js";
import { safeUnlink } from "./device-apps-mutate.js";
import { resolveDevicePath, shellQuote } from "./device-file-path.js";

/**
 * @returns {"file" | "directory" | "missing"}
 */
export async function getDevicePathKind(serial, devicePath) {
  const quoted = shellQuote(devicePath);
  const script = `if [ -f ${quoted} ]; then echo file; elif [ -d ${quoted} ]; then echo directory; else echo missing; fi`;
  const { stdout } = await runAdb(["-s", serial, "shell", script], { timeout: 20_000 });
  const kind = stdout.trim().split(/\r?\n/).pop()?.trim();

  if (kind === "file" || kind === "directory" || kind === "missing") {
    return kind;
  }

  return "missing";
}

/**
 * @param {string} serial
 * @param {string} devicePath absolute file path on device
 */
export async function pullDeviceFile(serial, devicePath) {
  const remotePath = resolveDevicePath(devicePath);
  const kind = await getDevicePathKind(serial, remotePath);

  if (kind === "directory") {
    const err = new Error("无法下载目录，请选择文件。");
    err.code = "is_directory";
    throw err;
  }

  if (kind === "missing") {
    const err = new Error("文件不存在。");
    err.code = "not_found";
    throw err;
  }

  return runWithAdbLock(async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cloud-phone-pull-"));
    const localPath = path.join(tmpDir, "blob");

    try {
      await runAdb(["-s", serial, "pull", remotePath, localPath], { timeout: 600_000 });
      const buffer = await fs.readFile(localPath);
      const filename = path.posix.basename(remotePath) || "download";

      return { buffer, filename, devicePath: remotePath };
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  });
}

/**
 * @param {string} serial
 * @param {string} devicePath absolute destination path on device
 * @param {string} localPath temp file on host
 */
export async function pushDeviceFile(serial, devicePath, localPath) {
  const remotePath = resolveDevicePath(devicePath);
  const parent = path.posix.dirname(remotePath);

  if (parent && parent !== "/") {
    const parentKind = await getDevicePathKind(serial, parent);

    if (parentKind === "missing") {
      const err = new Error("目标目录不存在。");
      err.code = "parent_missing";
      throw err;
    }

    if (parentKind === "file") {
      const err = new Error("目标路径无效。");
      err.code = "parent_not_dir";
      throw err;
    }
  }

  return runWithAdbLock(async () => {
    await runAdb(["-s", serial, "push", localPath, remotePath], { timeout: 600_000 });

    return { devicePath: remotePath };
  });
}

export function buildDownloadHeaders(filename) {
  const base = path.posix.basename(String(filename || "download"));
  const ascii = base.replace(/[^\x20-\x7E]+/g, "_") || "download";

  return {
    "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(base)}`,
  };
}
