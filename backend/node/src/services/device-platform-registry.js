import { listHdcTargets } from "./hdc/hdc-exec.js";

/** @type {Map<string, "android" | "harmony">} */
const platformBySerial = new Map();

export function setDevicePlatform(serial, platform) {
  if (!serial) {
    return;
  }

  platformBySerial.set(serial, platform);
}

export function rememberDevicePlatforms(devices) {
  for (const device of devices ?? []) {
    if (device?.serial && device?.platform) {
      platformBySerial.set(device.serial, device.platform);
    }
  }
}

export function getDevicePlatform(serial) {
  return platformBySerial.get(serial) ?? "android";
}

export function isHarmonyDevice(serial) {
  return getDevicePlatform(serial) === "harmony";
}

export async function resolveDevicePlatform(serial) {
  const cached = platformBySerial.get(serial);

  if (cached) {
    return cached;
  }

  try {
    const targets = await listHdcTargets();

    if (targets.includes(serial)) {
      platformBySerial.set(serial, "harmony");
      return "harmony";
    }
  } catch {
    // hdc unavailable — treat as android
  }

  platformBySerial.set(serial, "android");
  return "android";
}
