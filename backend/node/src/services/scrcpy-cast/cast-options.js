import { SCRCPY_WEB_CAST_MODE } from "../../config/scrcpy-paths.js";
import {
  DEFAULT_VIDEO_BITRATE_MBPS,
  maxSizeFromMirrorVideo,
  resolveVideoStreamSummary,
} from "./video-stream-config.js";

/**
 * Map UI / API options to scrcpy-server shell parameters (official protocol).
 * @param {Record<string, unknown>} input
 */
export function resolveCastServerOptions(input = {}) {
  const mirror = /** @type {Record<string, any>} */ (input.mirror ?? input);
  const video = mirror.video ?? {};
  const audio = mirror.audio ?? {};
  const device = mirror.device ?? {};
  const screen = mirror.screen ?? {};
  const stream = resolveVideoStreamSummary(input);

  return {
    maxSize: stream.maxSize,
    videoCodec: String(video.codec ?? input.videoCodec ?? "h264").toLowerCase(),
    videoEncoder: stream.videoEncoder,
    videoBitRate: stream.videoBitRate,
    maxFps: stream.maxFps,
    video: stream.videoDisabled !== true && input.video !== false,
    audio: stream.videoDisabled === true || audio.disabled !== true,
    control: input.control !== false,
    audioSource: String(audio.source ?? "output"),
    audioBitRate: Number(audio.bitRateKbps ?? 128) * 1000,
    showTouches: Boolean(device.showTouches),
    stayAwake: Boolean(device.stayAwake),
    turnScreenOff: Boolean(device.turnScreenOff),
    powerOn: device.powerOn !== false,
    displayId: screen.displayId ? Number(screen.displayId) : undefined,
    captureOrientation: video.captureOrientation,
    videoStreamCodecOptions: stream.videoStreamCodecOptions,
    videoBitRateMbps: Number(video.bitRateMbps ?? DEFAULT_VIDEO_BITRATE_MBPS),
  };
}

export function listCastFeatures(options) {
  const features = ["video", "control"];

  if (options.audio) {
    features.push("audio");
  }

  features.push(
    "touch",
    "keyboard",
    "navigation",
    "clipboard",
    "display_power",
    "mirror_settings",
    "video_stream_parameters",
  );

  return features;
}
