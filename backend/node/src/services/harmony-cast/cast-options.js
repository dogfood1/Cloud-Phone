function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Harmony JPEG cast only supports uitest capture options (scale/quality).
 * Scrcpy fields such as maxSize, bitRate, encoder are ignored.
 */
export function normalizeHarmonyCastOptions(raw = {}) {
  const scale = clamp(Number(raw.scale ?? raw.harmony?.scale ?? 0.5), 0.2, 1);
  const quality = clamp(Number(raw.quality ?? raw.harmony?.quality ?? 30), 5, 95);

  return {
    platform: "harmony",
    scale,
    quality,
  };
}

/** ECHO/hdckit only pass scale to uitest Captures.startCaptureScreen. */
export function buildCaptureScreenArgs(options) {
  const scale = Number(options.scale);
  const captureOptions = {};

  if (scale > 0 && scale < 1) {
    captureOptions.scale = scale;
  }

  return { options: captureOptions };
}
