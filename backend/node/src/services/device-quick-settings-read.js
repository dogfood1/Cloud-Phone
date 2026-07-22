import { runAdb } from "./adb-command.js";
import { runWithAdbLock } from "./adb-lock.js";

/**
 * @param {string} serial
 * @returns {Promise<{
 *   wifi: { supported: boolean, enabled: boolean, connected: boolean, name: string },
 *   bluetooth: { supported: boolean, enabled: boolean, connected: boolean, name: string },
 *   airplane: { supported: boolean, enabled: boolean },
 *   volume: { supported: boolean, level: number, max: number, muted: boolean },
 *   brightness: { supported: boolean, level: number, max: number, auto: boolean },
 * }>}
 */
export async function readDeviceQuickSettings(serial) {
  return runWithAdbLock(() => readDeviceQuickSettingsUnlocked(serial), { lockKey: serial });
}

/**
 * Caller must already hold the ADB lock for this serial.
 * @param {string} serial
 */
export async function readDeviceQuickSettingsUnlocked(serial) {
  const [
    wifiOn,
    wifiStatus,
    btOn,
    btDump,
    airplane,
    audioDump,
    brightness,
    brightnessMode,
  ] = await Promise.all([
    adbShellText(serial, ["settings", "get", "global", "wifi_on"]),
    adbShellText(serial, ["cmd", "wifi", "status"]),
    adbShellText(serial, ["settings", "get", "global", "bluetooth_on"]),
    adbShellText(serial, ["dumpsys", "bluetooth_manager"], { maxBuffer: 2 * 1024 * 1024 }),
    adbShellText(serial, ["settings", "get", "global", "airplane_mode_on"]),
    adbShellText(serial, ["dumpsys", "audio"], { maxBuffer: 4 * 1024 * 1024 }),
    adbShellText(serial, ["settings", "get", "system", "screen_brightness"]),
    adbShellText(serial, ["settings", "get", "system", "screen_brightness_mode"]),
  ]);

  return {
    wifi: parseWifi(wifiOn, wifiStatus),
    bluetooth: parseBluetooth(btOn, btDump),
    airplane: parseAirplane(airplane),
    volume: parseVolume(audioDump),
    brightness: parseBrightness(brightness, brightnessMode),
  };
}

/**
 * @param {string} serial
 * @param {string[]} args
 * @param {{ maxBuffer?: number }} [options]
 */
async function adbShellText(serial, args, options = {}) {
  try {
    const { stdout } = await runAdb(["-s", serial, "shell", ...args], {
      timeout: 10_000,
      maxBuffer: options.maxBuffer ?? 512 * 1024,
    });
    return String(stdout ?? "");
  } catch {
    return "";
  }
}

function parseWifi(wifiOnRaw, statusDump) {
  const onSetting = parse01(wifiOnRaw);
  const dump = String(statusDump || "");
  const enabledFromCmd =
    /^Wifi is enabled/im.test(dump) || /Wifi is enabled/i.test(dump);
  const disabledFromCmd =
    /^Wifi is disabled/im.test(dump) || /Wifi is disabled/i.test(dump);

  let enabled = onSetting;
  if (enabled === null) {
    if (enabledFromCmd) enabled = true;
    else if (disabledFromCmd) enabled = false;
  }

  const ssid = cleanSsid(
    matchFirst(dump, [
      /Wifi is connected to\s+"([^"]+)"/i,
      /SSID:\s*"([^"]+)"/i,
      /ssid:\s*"([^"]+)"/i,
    ]) || "",
  );

  const connected = Boolean(enabled) && Boolean(ssid);
  const supported = onSetting !== null || Boolean(dump.trim()) || enabledFromCmd || disabledFromCmd;

  return {
    supported,
    enabled: Boolean(enabled),
    connected,
    name: ssid,
  };
}

function parseBluetooth(btOnRaw, dumpRaw) {
  const dump = String(dumpRaw || "").slice(0, 80_000);
  const onSetting = parse01(btOnRaw);
  const statusBlock = dump.match(/Bluetooth Status[\s\S]{0,400}/i)?.[0] || dump.slice(0, 400);

  const enabledFromDump =
    /enabled:\s*true/i.test(statusBlock) || /^\s*state:\s*ON\b/im.test(statusBlock);
  const disabledFromDump =
    /enabled:\s*false/i.test(statusBlock) || /^\s*state:\s*OFF\b/im.test(statusBlock);

  let enabled = null;
  if (enabledFromDump) enabled = true;
  else if (disabledFromDump) enabled = false;
  else if (onSetting !== null) enabled = onSetting;

  const connectedName = cleanDeviceName(
    matchFirst(dump, [
      /ConnectionState:\s*(?:STATE_)?CONNECTED[\s\S]{0,160}?name:\s*([^\n\r]+)/i,
      /Connected:\s*true[\s\S]{0,160}?name:\s*([^\n\r]+)/i,
      /Device\s+"([^"]+)"[\s\S]{0,120}?CONNECTED/i,
      /name:\s*([^\n\r]+)[\s\S]{0,80}?ConnectionState:\s*(?:STATE_)?CONNECTED/i,
      /A2DP.*?name:\s*([^\n\r]+)/i,
    ]) || "",
  );

  const supported = onSetting !== null || /Bluetooth Status/i.test(dump) || Boolean(statusBlock.trim());

  return {
    supported,
    enabled: Boolean(enabled),
    connected: Boolean(enabled) && Boolean(connectedName),
    name: connectedName,
  };
}

function parseAirplane(raw) {
  const value = parse01(raw);
  return {
    supported: value !== null,
    enabled: Boolean(value),
  };
}

function parseVolume(dump) {
  if (!dump.trim()) {
    return { supported: false, level: 0, max: 15, muted: false };
  }

  const musicBlock =
    dump.match(/- STREAM_MUSIC:([\s\S]{0,800}?)(?=\n\s*- STREAM_|\n\s*Volume Groups|$)/i)?.[1] ||
    dump.match(/STREAM_MUSIC:([\s\S]{0,800}?)(?=STREAM_[A-Z_]+:|$)/i)?.[1] ||
    "";

  const source = musicBlock || dump;
  const muted = /^\s*Muted:\s*true/im.test(source);

  let max = Number(
    matchFirst(source, [/^\s*Max:\s*(\d+)/im, /maxStreamVolume[:=]\s*(\d+)/i]) ?? NaN,
  );
  let level = Number(
    matchFirst(source, [
      /^\s*streamVolume:\s*(\d+)/im,
      /Current:\s*[^\n]*speaker\):\s*(\d+)/i,
      /Current:\s*(\d+)/i,
    ]) ?? NaN,
  );

  if (!Number.isFinite(max) || max <= 0) {
    max = 15;
  }

  if (!Number.isFinite(level)) {
    level = 0;
  }

  level = Math.max(0, Math.min(max, level));

  return {
    supported: true,
    level,
    max,
    muted,
  };
}

function parseBrightness(raw, modeRaw) {
  const level = Number.parseInt(String(raw).trim(), 10);
  const mode = Number.parseInt(String(modeRaw).trim(), 10);
  const supported = Number.isFinite(level);

  return {
    supported,
    level: supported ? Math.max(0, Math.min(255, level)) : 0,
    max: 255,
    auto: mode === 1,
  };
}

function parse01(raw) {
  const text = String(raw ?? "").trim().toLowerCase();
  if (text === "1" || text === "true") return true;
  if (text === "0" || text === "false") return false;
  if (text === "null" || text === "" || text === "nil") return null;
  const num = Number.parseInt(text, 10);
  if (Number.isFinite(num)) return num !== 0;
  return null;
}

function matchFirst(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

function cleanSsid(ssid) {
  const value = String(ssid || "")
    .replace(/^<|>$/g, "")
    .replace(/^"|"$/g, "")
    .trim();

  if (!value || /^0x/i.test(value) || /unknown ssid/i.test(value) || value === "<none>") {
    return "";
  }

  return value;
}

function cleanDeviceName(name) {
  const value = String(name || "")
    .replace(/^["']|["']$/g, "")
    .replace(/\r/g, "")
    .trim();

  if (!value || /^(null|none|unknown)$/i.test(value)) {
    return "";
  }

  return value.slice(0, 48);
}
