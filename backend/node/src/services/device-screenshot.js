import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { runWithAdbLock } from "./adb-lock.js";
import { resolveAdbPath } from "./adb-path.js";
import { runScreenshotTask } from "./device-screenshot-queue.js";

const execFileAsync = promisify(execFile);

function normalizeScreenshotError(error) {
  const stderr = String(error?.stderr ?? "");
  const message = String(error?.message ?? "");
  const detail = `${stderr}\n${message}`.trim();

  if (/device offline/i.test(detail)) {
    const err = new Error("Device is offline.");
    err.code = "device_offline";
    return err;
  }

  if (/error:\s*closed/i.test(detail)) {
    const err = new Error("ADB connection closed.");
    err.code = "adb_connection_closed";
    return err;
  }

  if (/not found/i.test(detail)) {
    const err = new Error("Device not found.");
    err.code = "device_not_found";
    return err;
  }

  const err = new Error(detail || "Screenshot capture failed.");
  err.code = "screenshot_failed";
  return err;
}

export async function captureDeviceScreenshot(serial) {
  return runWithAdbLock(
    () => runScreenshotTask(() => captureDeviceScreenshotUnsafe(serial)),
    { lockKey: serial },
  );
}

async function captureDeviceScreenshotUnsafe(serial) {
  const adbPath = resolveAdbPath();

  try {
    const { stdout } = await execFileAsync(
      adbPath,
      ["-s", serial, "exec-out", "screencap", "-p"],
      {
        windowsHide: true,
        timeout: 15000,
        maxBuffer: 16 * 1024 * 1024,
        encoding: "buffer",
      },
    );

    if (!stdout || stdout.length < 24) {
      const err = new Error("Screenshot payload is empty.");
      err.code = "screenshot_empty";
      throw err;
    }

    return stdout;
  } catch (error) {
    if (error?.code === "screenshot_empty") {
      throw error;
    }

    throw normalizeScreenshotError(error);
  }
}
