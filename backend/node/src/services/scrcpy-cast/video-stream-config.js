import { buildStreamExtrasFromMirror } from "./mirror-stream-extras.js";

const CODEC_LIKE_ENCODER_NAMES = new Set(["h264", "h265", "hevc", "av1", "opus", "aac", "flac"]);

function normalizeVideoEncoderName(encoder) {
  const name = String(encoder ?? "").trim();

  if (!name || CODEC_LIKE_ENCODER_NAMES.has(name.toLowerCase())) {
    return "";
  }

  return name;
}

const RESOLUTION_MAX_SIZE = {
  original: 0,
  "4k": 2160,
  "1440p": 1440,
  "1080p": 1920,
  "720p": 1280,
  "540p": 960,
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

export function buildVideoStreamCodecOptions(mirror = {}) {
  return buildStreamExtrasFromMirror(mirror);
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
    videoEncoder: normalizeVideoEncoderName(video.encoder) || undefined,
    videoCodec: String(video.codec ?? "h264").toLowerCase(),
    captureOrientation: String(video.captureOrientation ?? "0"),
    videoStreamCodecOptions: buildVideoStreamCodecOptions(mirror),
    videoDisabled: video.disabled === true || input.video === false,
  };
}
