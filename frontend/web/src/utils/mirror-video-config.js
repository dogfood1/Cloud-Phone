import { MIRROR_RESOLUTIONS } from "./mirror-cast-constants.js";
import {
  DEFAULT_VIDEO_CODEC,
  resolveVideoEncoderName,
  sortVideoEncoders,
} from "./mirror-encoder-utils.js";
import { isNewDisplayEnabled } from "./mirror-screen-utils.js";
import { buildStreamExtrasFromMirror } from "./mirror-stream-extras.js";

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
 * @param {Record<string, any>} mirror
 */
export function buildVideoStreamCodecOptions(mirror = {}) {
  return buildStreamExtrasFromMirror(mirror);
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

  // scrcpy uses display id NONE (-1) with --new-display; server applies new_display from codec extras.
  const displayId = isNewDisplayEnabled(screen)
    ? -1
    : Number(screen.displayId ?? 0) || 0;

  const encoderList = sortVideoEncoders(castOptions.videoEncoders ?? mirror.videoEncoders ?? []);
  const encoderName = resolveVideoEncoderName(video.encoder, encoderList);
  const matched = encoderList.find((item) => item.value === encoderName);

  return {
    bitRate: Math.round(Number(video.bitRateMbps ?? DEFAULT_VIDEO_BITRATE_MBPS) * 1_000_000),
    maxFps: Number(video.maxFps ?? 60),
    iFrameInterval: Number(video.iFrameInterval ?? 10),
    width: maxSize > 0 ? maxSize & ~15 : 0,
    height: 0,
    displayId,
    lockedVideoOrientation: -1,
    sendFrameMeta: false,
    codecOptions: buildVideoStreamCodecOptions(mirror),
    encoderName,
    videoCodec: String(matched?.codec ?? video.codec ?? DEFAULT_VIDEO_CODEC).toLowerCase(),
  };
}
