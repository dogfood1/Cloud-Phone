import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { resolveAdbPath } from "./adb-path.js";

const execFileAsync = promisify(execFile);

export async function captureDeviceScreenshot(serial) {
  const adbPath = resolveAdbPath();
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
    throw new Error("Screenshot payload is empty.");
  }

  return stdout;
}
