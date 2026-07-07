import {
  buildIosSerial,
  getIosDevice,
  getStoredIosDevices,
  removeIosDevice,
  upsertIosDevice,
} from "./ios-device-store.js";
import { discoverIosWdaBridges } from "./ios-mdns.js";
import {
  fetchWdaDeviceInfo,
  fetchWdaScreen,
  normalizeIosEndpoint,
  probeWdaStatus,
} from "./ios-wda-client.js";

function mapDeviceInfo(info, endpoint, meta = {}) {
  const udid = info?.udid || meta.udid || "";
  const serial = buildIosSerial({ udid, host: endpoint.host, httpPort: endpoint.httpPort });
  const model = info?.model || meta.model || "iPhone";
  const name = info?.name || meta.name || model;

  return {
    serial,
    platform: "ios",
    state: "device",
    connected: true,
    manufacturer: "Apple",
    model,
    product: model,
    displayName: name,
    iosVersion: info?.os?.version || meta.iosVersion || null,
    udid,
    endpoint,
    source: meta.source ?? "manual",
    bridgeHost: meta.bridgeHost ?? endpoint.host,
    addedAt: meta.addedAt ?? Date.now(),
    lastSeenAt: Date.now(),
  };
}

async function probeEndpoint(endpoint) {
  await probeWdaStatus(endpoint.host, endpoint.httpPort);
  const [info, screen] = await Promise.all([
    fetchWdaDeviceInfo(endpoint.host, endpoint.httpPort).catch(() => ({})),
    fetchWdaScreen(endpoint.host, endpoint.httpPort).catch(() => null),
  ]);

  return { info, screen };
}

export async function discoverIosDevices(timeoutMs = 3500) {
  const bridges = await discoverIosWdaBridges({ timeoutMs });
  const results = [];

  for (const bridge of bridges) {
    const endpoint = {
      host: bridge.host,
      httpPort: bridge.httpPort,
      mjpegPort: bridge.mjpegPort,
    };

    try {
      const { info, screen } = await probeEndpoint(endpoint);
      results.push(
        mapDeviceInfo(info, endpoint, {
          udid: bridge.udid,
          model: bridge.model,
          iosVersion: bridge.iosVersion,
          name: bridge.name,
          source: "mdns",
          bridgeHost: bridge.bridgeHost,
        }),
      );

      if (screen?.width && screen?.height) {
        results.at(-1).displaySize = { width: screen.width, height: screen.height };
      }
    } catch {
      results.push({
        serial: buildIosSerial({ udid: bridge.udid, host: endpoint.host, httpPort: endpoint.httpPort }),
        platform: "ios",
        state: "offline",
        connected: false,
        displayName: bridge.name || bridge.host,
        endpoint,
        source: "mdns",
        bridgeHost: bridge.bridgeHost,
        error: "wda_unreachable",
      });
    }
  }

  return results;
}

export async function connectIosDevice(input = {}) {
  const endpoint = normalizeIosEndpoint(input);
  const { info, screen } = await probeEndpoint(endpoint);
  const device = mapDeviceInfo(info, endpoint, {
    udid: input.udid,
    name: input.name,
    source: input.source ?? "manual",
    bridgeHost: input.bridgeHost ?? endpoint.host,
  });

  if (screen?.width && screen?.height) {
    device.displaySize = { width: screen.width, height: screen.height };
  }

  await upsertIosDevice(device);
  return device;
}

export async function disconnectIosDevice(serial) {
  return removeIosDevice(serial);
}

export async function listIosDevices() {
  const stored = await getStoredIosDevices();
  const devices = [];

  for (const storedDevice of stored) {
    const endpoint = storedDevice.endpoint;

    if (!endpoint?.host) {
      continue;
    }

    try {
      const { info, screen } = await probeEndpoint(endpoint);
      const device = mapDeviceInfo(info, endpoint, {
        ...storedDevice,
        source: storedDevice.source,
        addedAt: storedDevice.addedAt,
      });

      if (screen?.width && screen?.height) {
        device.displaySize = { width: screen.width, height: screen.height };
      }

      await upsertIosDevice(device);
      devices.push(device);
    } catch {
      devices.push({
        ...storedDevice,
        connected: false,
        state: "offline",
        lastSeenAt: Date.now(),
      });
    }
  }

  return devices;
}

export function getIosDeviceEndpoint(serial) {
  const device = getIosDevice(serial);
  return device?.endpoint ?? null;
}

export async function captureIosScreenshot(serial) {
  const endpoint = getIosDeviceEndpoint(serial);

  if (!endpoint) {
    const error = new Error("iOS device is not registered.");
    error.code = "device_not_found";
    throw error;
  }

  const { captureWdaScreenshot } = await import("./ios-wda-client.js");
  return captureWdaScreenshot(endpoint.host, endpoint.httpPort);
}
