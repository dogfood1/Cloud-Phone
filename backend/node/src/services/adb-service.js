import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { runAdb } from "./adb-command.js";
import { runWithAdbLock } from "./adb-lock.js";
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
  return runWithAdbLock(listDevicesUnsafe);
}

export async function pairDeviceWithCode(host, port, pairingCode) {
  return runWithAdbLock(async () => pairDeviceWithCodeUnsafe(host, port, pairingCode));
}

export async function connectDeviceByHost(host, preferredPort) {
  return runWithAdbLock(async () => connectDeviceByHostUnsafe(host, preferredPort));
}

async function listDevicesUnsafe() {
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

async function pairDeviceWithCodeUnsafe(host, port, pairingCode) {
  const target = `${host}:${port}`;

  try {
    const { stdout = "", stderr = "" } = await runAdb(["pair", target, pairingCode], {
      timeout: 20_000,
    });
    const output = `${stdout}\n${stderr}`.trim();
    const success =
      /Successfully paired to|Pairing successful|already paired/i.test(output) &&
      !/failed|error/i.test(output);

    return {
      success,
      target,
      output: output || "adb pair finished",
    };
  } catch (error) {
    return {
      success: false,
      target,
      output: error instanceof Error ? error.message : "adb pair failed",
    };
  }
}

async function connectDeviceByHostUnsafe(host, preferredPort) {
  const candidates = buildConnectPortCandidates(preferredPort);
  const attempts = [];
  let connectedEndpoint = null;

  for (const port of candidates) {
    const endpoint = `${host}:${port}`;

    try {
      const { stdout = "", stderr = "" } = await runAdb(["connect", endpoint], {
        timeout: 4_000,
      });
      const output = `${stdout}\n${stderr}`.trim();
      const ok = /connected to|already connected to/i.test(output);
      attempts.push({ endpoint, ok, output });

      if (ok) {
        connectedEndpoint = endpoint;
        break;
      }
    } catch (error) {
      attempts.push({
        endpoint,
        ok: false,
        output: error instanceof Error ? error.message : "connect failed",
      });
    }
  }

  const listed = await listDevicesUnsafe();
  const matched =
    listed.devices.find((item) => item.serial === connectedEndpoint) ||
    listed.devices.find((item) => item.serial?.startsWith(`${host}:`)) ||
    null;

  return {
    success: Boolean(matched && matched.connected),
    connectedEndpoint: matched?.serial ?? connectedEndpoint,
    device: matched,
    attempts,
  };
}

function buildConnectPortCandidates(preferredPort) {
  const ports = new Set([5555]);
  const base = Number(preferredPort);

  if (Number.isFinite(base) && base > 0) {
    for (let delta = -20; delta <= 20; delta += 1) {
      const candidate = base + delta;

      if (candidate >= 1024 && candidate <= 65535) {
        ports.add(candidate);
      }
    }

    // Wireless debugging often opens a different random high port.
    for (let offset = 1; offset <= 60; offset += 1) {
      const up = base + offset * 5;
      const down = base - offset * 5;

      if (up <= 65535) {
        ports.add(up);
      }

      if (down >= 1024) {
        ports.add(down);
      }
    }
  }

  return Array.from(ports);
}
