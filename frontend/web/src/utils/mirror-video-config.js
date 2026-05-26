import { MIRROR_RESOLUTIONS } from "./mirror-cast-constants.js";

const RESOLUTION_MAX_SIZE = Object.fromEntries(
  MIRROR_RESOLUTIONS.map((item) => [item.value, item.maxSize]),
);

export const DEFAULT_VIDEO_BITRATE_MBPS = 5;

/**
 * scrcpy max_size: longest edge in pixels; 0 = device native.
 * @param {{ resolution?: string }} video
 */
export function maxSizeFromMirrorVideo(video = {}) {
  const mapped = RESOLUTION_MAX_SIZE[video.resolution];

  if (mapped === null || mapped === undefined) {
    return 0;
  }

  return mapped;
}

/**
 * @param {string} captureOrientation
 * @returns {string} scrcpy capture_orientation server value
 */
export function captureOrientationServerValue(captureOrientation) {
  const value = String(captureOrientation ?? "0");

  if (value === "0") {
    return "0";
  }

  return `@${value}`;
}

/**
 * Extra stream options passed via ws-scrcpy codecOptions (parsed on device).
 * @param {{ captureOrientation?: string }} video
 */
export function buildVideoStreamCodecOptions(video = {}) {
  const capture = captureOrientationServerValue(video.captureOrientation);

  if (!capture) {
    return "";
  }

  return `capture_orientation=${capture}`;
}

/**
 * Build ws-scrcpy type-101 payload fields from cast options.
 * @param {Record<string, unknown>} castOptions
 */
export function videoStreamSettingsFromCastOptions(castOptions = {}) {
  const mirror = /** @type {Record<string, any>} */ (castOptions.mirror ?? {});
  const video = mirror.video ?? {};
  const screen = mirror.screen ?? {};

  const maxSize =
    Number(castOptions.maxSize) || maxSizeFromMirrorVideo(video) || 0;

  const displayId = screen.useNewDisplay
    ? 0
    : Number(screen.displayId ?? 0) || 0;

  return {
    bitRate: Math.round(Number(video.bitRateMbps ?? DEFAULT_VIDEO_BITRATE_MBPS) * 1_000_000),
    maxFps: Number(video.maxFps ?? 60),
    iFrameInterval: Number(video.iFrameInterval ?? 10),
    width: maxSize > 0 ? maxSize & ~15 : 0,
    height: 0,
    displayId,
    lockedVideoOrientation: -1,
    sendFrameMeta: false,
    codecOptions: buildVideoStreamCodecOptions(video),
    encoderName: String(video.encoder ?? ""),
  };
}
