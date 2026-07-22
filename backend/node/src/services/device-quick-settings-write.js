import { runAdb } from "./adb-command.js";
import { runWithAdbLock } from "./adb-lock.js";
import { readDeviceQuickSettingsUnlocked } from "./device-quick-settings-read.js";

/**
 * @param {string} serial
 * @param {{
 *   wifiEnabled?: boolean,
 *   bluetoothEnabled?: boolean,
 *   airplaneEnabled?: boolean,
 *   volumeLevel?: number,
 *   volumeMuted?: boolean,
 *   brightnessLevel?: number,
 * }} patch
 */
export async function applyDeviceQuickSettings(serial, patch) {
  return runWithAdbLock(async () => {
    if (typeof patch.airplaneEnabled === "boolean") {
      await setAirplane(serial, patch.airplaneEnabled);
    }

    if (typeof patch.wifiEnabled === "boolean") {
      await setWifi(serial, patch.wifiEnabled);
    }

    if (typeof patch.bluetoothEnabled === "boolean") {
      await setBluetooth(serial, patch.bluetoothEnabled);
    }

    if (typeof patch.volumeLevel === "number" || typeof patch.volumeMuted === "boolean") {
      await setVolume(serial, patch);
    }

    if (typeof patch.brightnessLevel === "number") {
      await setBrightness(serial, patch.brightnessLevel);
    }

    return readDeviceQuickSettingsUnlocked(serial);
  }, { lockKey: serial });
}

async function setWifi(serial, enabled) {
  await runAdbSafe(serial, ["svc", "wifi", enabled ? "enable" : "disable"]);
  await runAdbSafe(serial, [
    "cmd",
    "wifi",
    "set-wifi-enabled",
    enabled ? "enabled" : "disabled",
  ]);
}

async function setBluetooth(serial, enabled) {
  if (enabled) {
    await runAdbSafe(serial, ["cmd", "bluetooth_manager", "enable"]);
    await runAdbSafe(serial, ["svc", "bluetooth", "enable"]);
  } else {
    await runAdbSafe(serial, ["cmd", "bluetooth_manager", "disable"]);
    await runAdbSafe(serial, ["svc", "bluetooth", "disable"]);
  }
}

async function setAirplane(serial, enabled) {
  await runAdbSafe(serial, [
    "settings",
    "put",
    "global",
    "airplane_mode_on",
    enabled ? "1" : "0",
  ]);
  await runAdbSafe(serial, [
    "am",
    "broadcast",
    "-a",
    "android.intent.action.AIRPLANE_MODE",
    "--ez",
    "state",
    enabled ? "true" : "false",
  ]);
}

async function setVolume(serial, patch) {
  const current = await readDeviceQuickSettingsUnlocked(serial);
  const max = Math.max(1, current.volume.max || 15);
  let level = current.volume.level;

  if (typeof patch.volumeLevel === "number") {
    const pct = Math.max(0, Math.min(100, patch.volumeLevel));
    level = Math.round((pct / 100) * max);
  }

  if (patch.volumeMuted === true) {
    level = 0;
  } else if (patch.volumeMuted === false && level <= 0) {
    level = Math.max(1, Math.round(max * 0.3));
  }

  level = Math.max(0, Math.min(max, level));
  await runAdbSafe(serial, ["media", "volume", "--stream", "3", "--set", String(level)]);
  await runAdbSafe(serial, [
    "cmd",
    "media_session",
    "volume",
    "--stream",
    "3",
    "--set",
    String(level),
  ]);
}

async function setBrightness(serial, levelPct) {
  const pct = Math.max(0, Math.min(100, levelPct));
  const value = Math.max(1, Math.round((pct / 100) * 255));
  await runAdbSafe(serial, ["settings", "put", "system", "screen_brightness_mode", "0"]);
  await runAdbSafe(serial, ["settings", "put", "system", "screen_brightness", String(value)]);
}

async function runAdbSafe(serial, args) {
  try {
    await runAdb(["-s", serial, "shell", ...args], { timeout: 12_000 });
  } catch {
    // OEM command differences
  }
}
