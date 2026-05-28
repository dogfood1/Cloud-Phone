import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import bonjourService from "bonjour-service";
import { promisify } from "node:util";

import { runAdb } from "./adb-command.js";
import { runWithAdbLock } from "./adb-lock.js";
import { resolveAdbPath } from "./adb-path.js";
import { getDeviceDisplayName } from "./device-display.js";
import { getDeviceIpAddress } from "./device-ip.js";

const execFileAsync = promisify(execFile);
const { Bonjour } = bonjourService;

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

export async function createQrPairingSession() {
  const serviceName = randomToken(10);
  const pairingCode = randomDigits(6);
  const payload = `WIFI:T:ADB;S:${serviceName};P:${pairingCode};;`;

  return {
    serviceName,
    pairingCode,
    qrPayload: payload,
  };
}

export async function pairDeviceByQrService(serviceName, pairingCode) {
  return runWithAdbLock(async () => pairDeviceByQrServiceUnsafe(serviceName, pairingCode));
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

async function pairDeviceByQrServiceUnsafe(serviceName, pairingCode) {
  const discoveredPairService = await waitForMdnsService({
    serviceName,
    serviceType: "_adb-tls-pairing._tcp",
    timeoutMs: 25_000,
  });

  if (!discoveredPairService) {
    return {
      success: false,
      pair: {
        success: false,
        target: `${serviceName}._adb-tls-pairing._tcp`,
        output: "Pairing service was not discovered. Confirm phone scanned the QR code.",
      },
      connect: null,
      discovery: null,
    };
  }

  const pair = await pairDeviceWithCodeUnsafe(
    discoveredPairService.host,
    discoveredPairService.port,
    pairingCode,
  );

  if (!pair.success) {
    return {
      success: false,
      pair,
      connect: null,
      discovery: discoveredPairService,
    };
  }

  const discoveredConnectService = await waitForMdnsService({
    serviceType: "_adb-tls-connect._tcp",
    host: discoveredPairService.host,
    timeoutMs: 10_000,
  });

  const connect = await connectDeviceByHostUnsafe(
    discoveredPairService.host,
    discoveredConnectService?.port ?? discoveredPairService.port,
  );

  return {
    success: Boolean(pair.success && connect.success),
    pair,
    connect,
    discovery: {
      pairing: discoveredPairService,
      connect: discoveredConnectService,
    },
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

async function waitForMdnsService({ serviceName, serviceType, host, timeoutMs }) {
  const discovered = await discoverMdnsServiceWithBonjour({
    serviceName,
    serviceType,
    host,
    timeoutMs,
  });

  if (discovered) {
    return discovered;
  }

  // Fallback to adb mdns services parsing if Bonjour discovery is unavailable.
  return waitForMdnsServiceWithAdb({ serviceName, serviceType, host, timeoutMs });
}

async function waitForMdnsServiceWithAdb({ serviceName, serviceType, host, timeoutMs }) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const services = await listMdnsServicesWithAdb();
    const matched = services.find((item) => matchMdnsService(item, { serviceName, serviceType, host }));

    if (matched) {
      return matched;
    }

    await sleep(700);
  }

  return null;
}

async function listMdnsServicesWithAdb() {
  try {
    const { stdout = "" } = await runAdb(["mdns", "services"], {
      timeout: 5_000,
    });

    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map(parseMdnsLine)
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function discoverMdnsServiceWithBonjour({ serviceName, serviceType, host, timeoutMs }) {
  const type = normalizeBonjourType(serviceType);

  if (!type) {
    return null;
  }

  return new Promise((resolve) => {
    const bonjour = new Bonjour();
    let browser = null;
    let settled = false;

    const finish = (value) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      try {
        browser?.stop();
      } catch {}
      try {
        bonjour.destroy();
      } catch {}
      resolve(value);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    try {
      browser = bonjour.find({ type }, (service) => {
        const item = parseBonjourService(service);

        if (!item) {
          return;
        }

        if (matchMdnsService(item, { serviceName, serviceType, host })) {
          finish(item);
        }
      });
    } catch {
      finish(null);
    }
  });
}

function parseBonjourService(service) {
  const host = service?.addresses?.find((address) => /^\d{1,3}(\.\d{1,3}){3}$/.test(address));
  const port = Number(service?.port);
  const typeName = service?.type;

  if (!host || !Number.isInteger(port) || port <= 0) {
    return null;
  }

  const serviceType = typeName ? `_${typeName}._tcp` : null;
  const name = String(service?.name ?? "").trim();
  const fullName = serviceType ? `${name}.${serviceType}.` : name;

  return {
    raw: `${fullName} ${host}:${port}`,
    fullName,
    name,
    serviceType,
    host,
    port,
  };
}

function normalizeBonjourType(serviceType) {
  if (!serviceType) {
    return null;
  }

  return serviceType.replace(/^_/, "").replace(/\._tcp$/, "");
}

function matchMdnsService(item, { serviceName, serviceType, host }) {
  if (serviceType && item.serviceType !== serviceType) {
    return false;
  }
  if (serviceName && !item.name.includes(serviceName)) {
    return false;
  }
  if (host && item.host !== host) {
    return false;
  }
  return true;
}

function parseMdnsLine(line) {
  // Example: "adb-xxxx._adb-tls-connect._tcp. 192.168.1.22:37123"
  const match = line.match(/^(\S+)\s+([0-9.]+):(\d{1,5})$/);
  if (!match) {
    return null;
  }

  const fullName = match[1];
  const host = match[2];
  const port = Number.parseInt(match[3], 10);
  const typeMatch = fullName.match(/(\._adb-tls-(?:pairing|connect)\._tcp)\.?$/);
  const serviceType = typeMatch?.[1] ?? null;
  const name = serviceType ? fullName.replace(serviceType, "").replace(/\.$/, "") : fullName;

  return {
    raw: line,
    fullName,
    name,
    serviceType,
    host,
    port,
  };
}

function randomToken(byteLength) {
  return randomBytes(byteLength).toString("hex");
}

function randomDigits(length) {
  let text = "";
  while (text.length < length) {
    text += Math.floor(Math.random() * 10).toString();
  }
  return text.slice(0, length);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
