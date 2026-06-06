import { buildCastPayloadFromMirrorSettings } from "./build-cast-payload.js";
import { createDefaultMirrorSettings } from "./mirror-cast-defaults.js";
import { MIRROR_RESOLUTIONS } from "./mirror-cast-constants.js";

/** 720p long edge — matches grid tile size; avoids 1080p decode waste in multi-cast. */
export const GROUP_CONTROL_TARGET_MAX_SIZE = 1280;
export const GROUP_CONTROL_TARGET_MAX_FPS = 20;
/** Lower than single-device mirror (5 Mbps) to keep multi-stream playback smooth. */
export const GROUP_CONTROL_VIDEO_BITRATE_MBPS = 2;
export const GROUP_CONTROL_START_STAGGER_MS = 450;

/** Fallback max_size when cast fails to start. */
export const GROUP_CONTROL_MAX_SIZE_FALLBACKS = [1280, 960, 720, 540, 0];

/**
 * scrcpy max_size caps the longest video edge. Targets 720p and uses the highest
 * preset that fits device native size when dimensions are known.
 */
export function resolveGroupControlMaxSize(device = {}, overrideMaxSize) {
  if (typeof overrideMaxSize === "number") {
    return overrideMaxSize;
  }

  const displayWidth = Number(device.displayWidth) || 0;
  const displayHeight = Number(device.displayHeight) || 0;

  if (displayWidth > 0 && displayHeight > 0) {
    const nativeLong = Math.max(displayWidth, displayHeight);

    if (nativeLong <= GROUP_CONTROL_TARGET_MAX_SIZE) {
      const presets = MIRROR_RESOLUTIONS.map((item) => item.maxSize)
        .filter((size) => size > 0)
        .sort((a, b) => b - a);

      for (const preset of presets) {
        if (preset <= nativeLong) {
          return preset;
        }
      }

      return 0;
    }
  }

  return GROUP_CONTROL_TARGET_MAX_SIZE;
}

export function buildGroupControlCastOptions(device = {}, options = {}) {
  const settings = createDefaultMirrorSettings();
  settings.video.maxFps = GROUP_CONTROL_TARGET_MAX_FPS;
  settings.video.bitRateMbps = GROUP_CONTROL_VIDEO_BITRATE_MBPS;
  settings.video.resolution = "720p";
  settings.video.iFrameInterval = 8;
  settings.audio.disabled = true;

  const maxSize = resolveGroupControlMaxSize(device, options.maxSize);
  const payload = buildCastPayloadFromMirrorSettings(
    settings,
    Number(device.sdkVersion) || 0,
  );

  return {
    ...payload,
    maxSize,
    audio: false,
    control: options.control !== false,
  };
}
