function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Map scrcpy-style maxSize hint to uitest JPEG scale (0.2–1). */
export function maxSizeToHarmonyScale(maxSize, device = {}) {
  const displayWidth = Number(device.displayWidth ?? device.displaySize?.width) || 0;
  const displayHeight = Number(device.displayHeight ?? device.displaySize?.height) || 0;
  const nativeLong = Math.max(displayWidth, displayHeight);

  if (nativeLong > 0 && maxSize > 0) {
    return clamp(maxSize / nativeLong, 0.2, 1);
  }

  if (maxSize >= 1920) {
    return 1;
  }

  if (maxSize >= 1280) {
    return 0.75;
  }

  if (maxSize >= 960) {
    return 0.6;
  }

  return 0.5;
}

/**
 * Harmony cast only accepts scale + quality. Other mirror/scrcpy fields are ignored.
 */
export function buildHarmonyCastOptions(device = {}, options = {}) {
  const scale =
    typeof options.scale === "number"
      ? clamp(options.scale, 0.2, 1)
      : maxSizeToHarmonyScale(Number(options.maxSize) || 0, device);

  const quality = clamp(Number(options.quality ?? 30), 5, 95);

  return {
    scale,
    quality,
  };
}

export function buildCastOptionsForDevice(device = {}, options = {}) {
  if (device?.platform === "harmony") {
    return buildHarmonyCastOptions(device, options);
  }

  return options;
}
