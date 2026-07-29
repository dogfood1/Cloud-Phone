const DEFAULT_DEVICE_INTERVAL_SECONDS = 1;
const DEFAULT_SCREENSHOT_INTERVAL_SECONDS = 5;
const MIN_INTERVAL_SECONDS = 1;
const MAX_INTERVAL_SECONDS = 120;

import {
  getCachedSettings,
  persistLocalStatePatch,
} from "./local-persistence-state.js";

export function loadSettings() {
  const settings = getCachedSettings();
  return {
    deviceListIntervalSeconds: normalizeInterval(
      Number(settings.deviceListIntervalSeconds),
      DEFAULT_DEVICE_INTERVAL_SECONDS,
    ),
    screenshotIntervalSeconds: normalizeInterval(
      Number(settings.screenshotIntervalSeconds),
      DEFAULT_SCREENSHOT_INTERVAL_SECONDS,
    ),
  };
}

export async function saveSettings(settings) {
  const result = await persistLocalStatePatch({
    settings: {
      deviceListIntervalSeconds: normalizeInterval(
        settings.deviceListIntervalSeconds,
        DEFAULT_DEVICE_INTERVAL_SECONDS,
      ),
      screenshotIntervalSeconds: normalizeScreenshotInterval(
        settings.screenshotIntervalSeconds,
      ),
    },
  });
  return {
    deviceListIntervalSeconds: normalizeInterval(
      Number(result.settings.deviceListIntervalSeconds),
      DEFAULT_DEVICE_INTERVAL_SECONDS,
    ),
    screenshotIntervalSeconds: normalizeInterval(
      Number(result.settings.screenshotIntervalSeconds),
      DEFAULT_SCREENSHOT_INTERVAL_SECONDS,
    ),
  };
}

export function normalizeScreenshotInterval(value) {
  return normalizeInterval(value, DEFAULT_SCREENSHOT_INTERVAL_SECONDS);
}

export function normalizeDeviceInterval(value) {
  return normalizeInterval(value, DEFAULT_DEVICE_INTERVAL_SECONDS);
}

function normalizeInterval(value, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(
    MAX_INTERVAL_SECONDS,
    Math.max(MIN_INTERVAL_SECONDS, Math.round(value)),
  );
}
