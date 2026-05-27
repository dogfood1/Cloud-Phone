import { maxSizeFromMirrorVideo } from "./mirror-video-config.js";
import {
  DEFAULT_VIDEO_CODEC,
  resolveVideoEncoderName,
  sortVideoEncoders,
} from "./mirror-encoder-utils.js";
import { buildStreamExtrasFromCamera } from "./camera-stream-extras.js";

const DEFAULT_CAMERA_BITRATE_MBPS = 8;

/**
 * @param {Record<string, unknown>} castOptions
 */
export function videoStreamSettingsFromCameraCastOptions(castOptions = {}) {
  const mirror = /** @type {Record<string, any>} */ (castOptions.mirror ?? {});
  const camera = mirror.camera ?? {};

  const maxSize =
    Number(castOptions.maxSize) || maxSizeFromMirrorVideo(camera) || 0;

  const encoderList = sortVideoEncoders(castOptions.videoEncoders ?? mirror.videoEncoders ?? []);
  const encoderName = resolveVideoEncoderName(camera.encoder, encoderList);
  const matched = encoderList.find((item) => item.value === encoderName);

  return {
    bitRate: Math.round(Number(camera.bitRateMbps ?? DEFAULT_CAMERA_BITRATE_MBPS) * 1_000_000),
    maxFps: Number(camera.maxFps ?? camera.fps ?? 30),
    iFrameInterval: Number(camera.iFrameInterval ?? 10),
    width: maxSize > 0 ? maxSize & ~15 : 0,
    height: 0,
    displayId: 0,
    lockedVideoOrientation: -1,
    sendFrameMeta: false,
    codecOptions: buildStreamExtrasFromCamera(mirror),
    encoderName,
    videoCodec: String(matched?.codec ?? camera.codec ?? DEFAULT_VIDEO_CODEC).toLowerCase(),
  };
}
