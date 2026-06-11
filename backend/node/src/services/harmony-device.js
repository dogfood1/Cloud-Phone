import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { resolveHdcPath } from "../config/harmony-paths.js";
import { rememberDevicePlatforms } from "./device-platform-registry.js";
import { runWithHdcLock } from "./hdc/hdc-lock.js";
import { listHdcTargets, runHdc } from "./hdc/hdc-exec.js";

async function readHarmonyParam(serial, key) {
  try {
    const { stdout } = await runHdc(["shell", `param get ${key}`], { serial, timeout: 5000 });
    return stdout.split(/\r?\n/)[0]?.trim() || null;
  } catch {
    return null;
  }
}

async function readHarmonyDisplaySize(serial) {
  try {
    const { stdout } = await runHdc(["shell", "hidumper -s RenderService -a screen"], {
      serial,
      timeout: 8000,
    });
    const match = stdout.match(/activeMode:\s*(\d+)x(\d+)/i);
    return match ? { width: Number(match[1]), height: Number(match[2]) } : null;
  } catch {
    return null;
  }
}

async function enrichHarmonyDevice(serial) {
  const [model, brand, sysVersion, sdkVersion, displaySize] = await Promise.all([
    readHarmonyParam(serial, "const.product.model"),
    readHarmonyParam(serial, "const.product.brand"),
    readHarmonyParam(serial, "const.product.software.version"),
    readHarmonyParam(serial, "const.ohos.apiversion"),
    readHarmonyDisplaySize(serial),
  ]);

  const displayName = [brand, model].filter(Boolean).join(" ").trim() || serial;

  return {
    serial,
    platform: "harmony",
    state: "device",
    connected: true,
    manufacturer: brand,
    model,
    harmonyVersion: sysVersion,
    sdkVersion,
    androidVersion: null,
    ipAddress: null,
    wireless: false,
    displayName,
    displaySize,
  };
}

export async function listHarmonyDevices() {
  return runWithHdcLock(async () => {
    const hdcPath = resolveHdcPath();
    const serials = await listHdcTargets();
    const devices = await Promise.all(serials.map((serial) => enrichHarmonyDevice(serial)));
    rememberDevicePlatforms(devices);

    return {
      hdcPath,
      devices,
    };
  });
}

export async function captureHarmonyScreenshot(serial) {
  return runWithHdcLock(async () => captureHarmonyScreenshotUnsafe(serial), { lockKey: serial });
}

async function captureHarmonyScreenshotUnsafe(serial) {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "cloud-phone-harmony-"));
  const remotePath = `/data/local/tmp/_cp_snap_${randomBytes(4).toString("hex")}.jpeg`;
  const localPath = path.join(tmpDir, "screen.jpeg");

  try {
    await runHdc(["shell", `snapshot_display -f ${remotePath}`], { serial, timeout: 12_000 });
    await runHdc(["file", "recv", remotePath, localPath], { serial, timeout: 20_000 });
    const buffer = await readFile(localPath);

    if (!buffer || buffer.length < 24) {
      const error = new Error("Harmony screenshot payload is empty.");
      error.code = "screenshot_empty";
      throw error;
    }

    return buffer;
  } catch (error) {
    if (error?.code === "screenshot_empty") {
      throw error;
    }

    const err = new Error(error instanceof Error ? error.message : "Harmony screenshot failed.");
    err.code = "harmony_screenshot_failed";
    throw err;
  } finally {
    await runHdc(["shell", `rm -f ${remotePath}`], { serial, timeout: 5000 }).catch(() => {});
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function writeHarmonyScreenshotFile(serial, filePath) {
  const buffer = await captureHarmonyScreenshot(serial);
  await writeFile(filePath, buffer);
  return filePath;
}
