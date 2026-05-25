const SETTINGS_STORAGE_KEY = "cloud-phone-settings";
const DEFAULT_SCREENSHOT_INTERVAL_SECONDS = 5;
const MIN_SCREENSHOT_INTERVAL_SECONDS = 1;
const MAX_SCREENSHOT_INTERVAL_SECONDS = 120;

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const interval = Number(parsed.screenshotIntervalSeconds);

    return {
      screenshotIntervalSeconds: normalizeScreenshotInterval(interval),
    };
  } catch {
    return {
      screenshotIntervalSeconds: DEFAULT_SCREENSHOT_INTERVAL_SECONDS,
    };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({
      screenshotIntervalSeconds: normalizeScreenshotInterval(
        settings.screenshotIntervalSeconds,
      ),
    }),
  );
}

export function normalizeScreenshotInterval(value) {
  if (!Number.isFinite(value)) {
    return DEFAULT_SCREENSHOT_INTERVAL_SECONDS;
  }

  return Math.min(
    MAX_SCREENSHOT_INTERVAL_SECONDS,
    Math.max(MIN_SCREENSHOT_INTERVAL_SECONDS, Math.round(value)),
  );
}
