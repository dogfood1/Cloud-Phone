import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { BACKEND_DATA_PATH } from "../../config/paths.js";

const STORE_PATH = path.resolve(BACKEND_DATA_PATH, "ios-devices.json");

/** @type {Map<string, object>} */
const devicesBySerial = new Map();
let loaded = false;

async function ensureLoaded() {
  if (loaded) {
    return;
  }

  loaded = true;

  try {
    await mkdir(BACKEND_DATA_PATH, { recursive: true });
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);

    for (const device of parsed?.devices ?? []) {
      if (device?.serial) {
        devicesBySerial.set(device.serial, device);
      }
    }
  } catch {
    // fresh store
  }
}

async function persist() {
  await mkdir(BACKEND_DATA_PATH, { recursive: true });
  await writeFile(
    STORE_PATH,
    `${JSON.stringify({ devices: [...devicesBySerial.values()] }, null, 2)}\n`,
    "utf8",
  );
}

export function buildIosSerial({ udid, host, httpPort }) {
  if (udid) {
    return `ios-${String(udid).replace(/[^a-zA-Z0-9_-]/g, "")}`;
  }

  const safeHost = String(host).replace(/[^a-zA-Z0-9._-]/g, "");
  return `ios-${safeHost}-${httpPort}`;
}

export async function getStoredIosDevices() {
  await ensureLoaded();
  return [...devicesBySerial.values()];
}

export function getIosDevice(serial) {
  return devicesBySerial.get(serial) ?? null;
}

export async function upsertIosDevice(device) {
  await ensureLoaded();
  devicesBySerial.set(device.serial, device);
  await persist();
  return device;
}

export async function removeIosDevice(serial) {
  await ensureLoaded();
  const removed = devicesBySerial.delete(serial);

  if (removed) {
    await persist();
  }

  return removed;
}
