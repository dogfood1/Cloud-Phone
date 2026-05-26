const RESOLUTION_MAX_SIZE = {
  original: 0,
  "1080p": 1920,
  "720p": 1280,
  "540p": 960,
  "1440p": 1440,
  "4k": 2160,
};

export const DEFAULT_VIDEO_BITRATE_MBPS = 5;

/**
 * @param {{ resolution?: string }} video
 */
export function maxSizeFromMirrorVideo(video = {}) {
  const mapped = RESOLUTION_MAX_SIZE[video.resolution];

  if (mapped === undefined) {
    return 1080;
  }

  return mapped;
}

export function captureOrientationServerValue(captureOrientation) {
  const value = String(captureOrientation ?? "0");

  if (value === "0") {
    return "0";
  }

  return `@${value}`;
}

/**
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
 * @param {Record<string, unknown>} input
 */
export function resolveVideoStreamSummary(input = {}) {
  const mirror = /** @type {Record<string, any>} */ (input.mirror ?? input);
  const video = mirror.video ?? {};

  const maxSize = Number(input.maxSize) || maxSizeFromMirrorVideo(video) || 0;
  const bitRateMbps = Number(video.bitRateMbps ?? DEFAULT_VIDEO_BITRATE_MBPS);

  return {
    maxSize,
    videoBitRate: Math.round(bitRateMbps * 1_000_000),
    maxFps: Number(video.maxFps ?? 60),
    videoEncoder: String(video.encoder ?? ""),
    captureOrientation: String(video.captureOrientation ?? "0"),
    videoStreamCodecOptions: buildVideoStreamCodecOptions(video),
    videoDisabled: video.disabled === true || input.video === false,
  };
}
