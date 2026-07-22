import { APP_VERSION } from "../config/version.js";
import { readDeviceQuickSettings } from "../services/device-quick-settings-read.js";
import { applyDeviceQuickSettings } from "../services/device-quick-settings-write.js";
import { readProtectedJsonBody, sendProtectedJson } from "../utils/protected-http.js";

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {string} method
 * @param {string} pathname
 */
export async function handleDeviceQuickSettingsRoute(req, res, method, pathname) {
  const match = pathname.match(/^\/api\/devices\/([^/]+)\/quick-settings$/);

  if (!match) {
    return false;
  }

  const serial = decodeURIComponent(match[1]);

  if (method === "GET") {
    try {
      const settings = await readDeviceQuickSettings(serial);
      sendProtectedJson(res, 200, {
        success: true,
        version: APP_VERSION,
        serial,
        settings: toClientSettings(settings),
      });
    } catch (error) {
      sendProtectedJson(res, 500, {
        success: false,
        version: APP_VERSION,
        serial,
        error: "quick_settings_read_failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
    return true;
  }

  if (method === "POST") {
    try {
      const body = await readProtectedJsonBody(req, res);
      const settings = await applyDeviceQuickSettings(serial, normalizePatch(body));
      sendProtectedJson(res, 200, {
        success: true,
        version: APP_VERSION,
        serial,
        settings: toClientSettings(settings),
      });
    } catch (error) {
      sendProtectedJson(res, 500, {
        success: false,
        version: APP_VERSION,
        serial,
        error: "quick_settings_write_failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
    return true;
  }

  return false;
}

function toClientSettings(settings) {
  const volumePct = settings.volume.supported
    ? Math.round((settings.volume.level / Math.max(1, settings.volume.max)) * 100)
    : 0;
  const brightnessPct = settings.brightness.supported
    ? Math.round((settings.brightness.level / Math.max(1, settings.brightness.max)) * 100)
    : 0;

  return {
    wifi: settings.wifi,
    bluetooth: settings.bluetooth,
    airplane: settings.airplane,
    volume: {
      supported: settings.volume.supported,
      level: volumePct,
      muted: settings.volume.muted || volumePct === 0,
    },
    brightness: {
      supported: settings.brightness.supported,
      level: brightnessPct,
      auto: settings.brightness.auto,
    },
  };
}

function normalizePatch(body) {
  return {
    wifiEnabled: typeof body?.wifiEnabled === "boolean" ? body.wifiEnabled : undefined,
    bluetoothEnabled:
      typeof body?.bluetoothEnabled === "boolean" ? body.bluetoothEnabled : undefined,
    airplaneEnabled:
      typeof body?.airplaneEnabled === "boolean" ? body.airplaneEnabled : undefined,
    volumeLevel: typeof body?.volumeLevel === "number" ? body.volumeLevel : undefined,
    volumeMuted: typeof body?.volumeMuted === "boolean" ? body.volumeMuted : undefined,
    brightnessLevel:
      typeof body?.brightnessLevel === "number" ? body.brightnessLevel : undefined,
  };
}
