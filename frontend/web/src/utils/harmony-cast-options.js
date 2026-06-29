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

  return 1;
}

/**
 * Harmony cast only accepts scale + quality. Other mirror/scrcpy fields are ignored.
 * Default scale is 1 (device native resolution).
 */
export function buildHarmonyCastOptions(device = {}, options = {}) {
  let scale;

  if (typeof options.scale === "number") {
    scale = clamp(options.scale, 0.2, 1);
  } else if (Number(options.maxSize) > 0) {
    scale = maxSizeToHarmonyScale(Number(options.maxSize), device);
  } else {
    scale = 1;
  }

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

export function resolveHarmonyNativeDisplaySize(device = {}, payload = {}) {
  const fromPayload = payload?.displaySize;
  if (fromPayload?.width > 0 && fromPayload?.height > 0) {
    return { width: fromPayload.width, height: fromPayload.height };
  }

  const video = payload?.video ?? {};
  if (video.nativeWidth > 0 && video.nativeHeight > 0) {
    return { width: video.nativeWidth, height: video.nativeHeight };
  }

  const fromDevice = device?.displaySize;
  if (fromDevice?.width > 0 && fromDevice?.height > 0) {
    return { width: fromDevice.width, height: fromDevice.height };
  }

  return null;
}

/** Match device native size to current JPEG/canvas orientation (portrait ↔ landscape). */
export function orientDisplaySizeToCanvas(displaySize, canvas) {
  if (!displaySize?.width || !displaySize?.height || !canvas?.width || !canvas?.height) {
    return {
      width: canvas?.width || displaySize?.width || 1,
      height: canvas?.height || displaySize?.height || 1,
    };
  }

  const canvasLandscape = canvas.width > canvas.height;
  const displayLandscape = displaySize.width > displaySize.height;

  if (canvasLandscape === displayLandscape) {
    return { width: displaySize.width, height: displaySize.height };
  }

  return { width: displaySize.height, height: displaySize.width };
}
