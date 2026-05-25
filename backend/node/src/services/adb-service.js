import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const projectRootPath = path.resolve(currentDirPath, "..", "..", "..", "..");

const ADB_EXECUTABLES = {
  win32: ["backend", "bin", "adb", "platform-tools-latest-windows", "platform-tools", "adb.exe"],
  linux: ["backend", "bin", "adb", "platform-tools-latest-linux", "platform-tools", "adb"],
  darwin: ["backend", "bin", "adb", "platform-tools-latest-darwin", "platform-tools", "adb"],
};

function resolveAdbPath() {
  const adbSegments = ADB_EXECUTABLES[process.platform];

  if (!adbSegments) {
    throw new Error(`Unsupported platform: ${process.platform}`);
  }

  return path.resolve(projectRootPath, ...adbSegments);
}

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
        };
      }

      const properties = await getDeviceProperties(adbPath, device.serial);

      return {
        ...device,
        manufacturer: properties?.manufacturer ?? null,
        model: properties?.model ?? device.model,
        androidVersion: properties?.androidVersion ?? null,
        sdkVersion: properties?.sdkVersion ?? null,
      };
    }),
  );

  return {
    adbPath,
    devices: enrichedDevices,
  };
}
