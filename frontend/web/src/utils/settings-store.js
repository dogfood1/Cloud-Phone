const SETTINGS_STORAGE_KEY = "cloud-phone-settings";
const DEFAULT_DEVICE_INTERVAL_SECONDS = 1;
const DEFAULT_SCREENSHOT_INTERVAL_SECONDS = 5;
const MIN_INTERVAL_SECONDS = 1;
const MAX_INTERVAL_SECONDS = 120;

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};

    return {
      deviceListIntervalSeconds: normalizeInterval(
        Number(parsed.deviceListIntervalSeconds),
        DEFAULT_DEVICE_INTERVAL_SECONDS,
      ),
      screenshotIntervalSeconds: normalizeInterval(
        Number(parsed.screenshotIntervalSeconds),
        DEFAULT_SCREENSHOT_INTERVAL_SECONDS,
      ),
    };
  } catch {
    return {
      deviceListIntervalSeconds: DEFAULT_DEVICE_INTERVAL_SECONDS,
      screenshotIntervalSeconds: DEFAULT_SCREENSHOT_INTERVAL_SECONDS,
    };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({
      deviceListIntervalSeconds: normalizeInterval(
        settings.deviceListIntervalSeconds,
        DEFAULT_DEVICE_INTERVAL_SECONDS,
      ),
      screenshotIntervalSeconds: normalizeScreenshotInterval(
        settings.screenshotIntervalSeconds,
      ),
    }),
  );
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
