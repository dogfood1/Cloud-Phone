import { getIosDevice } from "./ios/ios-device-store.js";
import { listHdcTargets } from "./hdc/hdc-exec.js";

/** @type {Map<string, "android" | "harmony" | "ios">} */
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

export function isIosDevice(serial) {
  return getDevicePlatform(serial) === "ios";
}

export async function resolveDevicePlatform(serial) {
  if (getIosDevice(serial)) {
    platformBySerial.set(serial, "ios");
    return "ios";
  }

  try {
    const targets = await listHdcTargets();

    if (targets.includes(serial)) {
      platformBySerial.set(serial, "harmony");
      return "harmony";
    }
  } catch {
    // hdc unavailable
  }

  platformBySerial.set(serial, "android");
  return "android";
}
