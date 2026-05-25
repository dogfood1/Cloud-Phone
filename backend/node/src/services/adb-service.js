import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { resolveAdbPath } from "./adb-path.js";
import { getDeviceDisplayName } from "./device-display.js";
import { getDeviceIpAddress } from "./device-ip.js";

const execFileAsync = promisify(execFile);

function parseDeviceList(stdout) {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("List of devices attached"))
    .map((line) => {
      const parts = line.split(/\s+/);
      const [serial = "", state = "unknown", ...metadataParts] = parts;
      const metadata = {};

      for (const part of metadataParts) {
        const separatorIndex = part.indexOf(":");

        if (separatorIndex <= 0) {
          continue;
        }

        const key = part.slice(0, separatorIndex);
        const value = part.slice(separatorIndex + 1);
        metadata[key] = value;
      }

      return {
        serial,
        state,
        connected: state === "device",
        product: metadata.product ?? null,
        model: metadata.model ?? null,
        device: metadata.device ?? null,
        transportId: metadata.transport_id ?? null,
      };
    });
}

async function getDeviceProperties(adbPath, serial) {
  try {
    const { stdout } = await execFileAsync(
      adbPath,
      ["-s", serial, "shell", "getprop"],
      { windowsHide: true, timeout: 5000, maxBuffer: 1024 * 1024 },
    );

    const propertyMap = new Map();
    const lines = stdout.split(/\r?\n/);

    for (const line of lines) {
      const match = line.match(/^\[(.+?)\]: \[(.*)\]$/);

      if (!match) {
        continue;
      }

      propertyMap.set(match[1], match[2]);
    }

    return {
      manufacturer: propertyMap.get("ro.product.manufacturer") ?? null,
      model:
        propertyMap.get("ro.product.model") ??
        propertyMap.get("ro.product.marketname") ??
        null,
      androidVersion: propertyMap.get("ro.build.version.release") ?? null,
      sdkVersion: propertyMap.get("ro.build.version.sdk") ?? null,
    };
  } catch {
    return null;
  }
}

async function enrichConnectedDevice(adbPath, device) {
  const [properties, ipAddress] = await Promise.all([
    getDeviceProperties(adbPath, device.serial),
    getDeviceIpAddress(adbPath, device.serial),
  ]);

  const enriched = {
    ...device,
    manufacturer: properties?.manufacturer ?? null,
    model: properties?.model ?? device.model,
    androidVersion: properties?.androidVersion ?? null,
    sdkVersion: properties?.sdkVersion ?? null,
    ipAddress,
  };

  return {
    ...enriched,
    displayName: getDeviceDisplayName(enriched),
  };
}

export async function listDevices() {
  const adbPath = resolveAdbPath();
  const { stdout } = await execFileAsync(adbPath, ["devices", "-l"], {
    windowsHide: true,
    timeout: 5000,
    maxBuffer: 1024 * 1024,
  });

  const devices = parseDeviceList(stdout);
  const enrichedDevices = await Promise.all(
    devices.map(async (device) => {
      if (!device.connected) {
        return {
          ...device,
          manufacturer: null,
          androidVersion: null,
          sdkVersion: null,
          ipAddress: null,
          displayName: getDeviceDisplayName(device),
        };
      }

      return enrichConnectedDevice(adbPath, device);
    }),
  );

  return {
    adbPath,
    devices: enrichedDevices,
  };
}
