import { resolveAudioStreamParams } from "../mirror-audio-platform.js";
import { appendScreenStreamExtras } from "../mirror-screen-utils.js";
import { captureOrientationServerValue } from "./video-stream-config.js";

/**
 * @param {string[]} parts
 * @param {Record<string, any>} mirror
 */
function appendAudioStreamExtras(parts, mirror) {
  const video = mirror.video ?? {};
  const audio = mirror.audio ?? {};
  const videoDisabled = video.disabled === true;
  const audioActive = videoDisabled || audio.disabled !== true;

  if (videoDisabled) {
    parts.push("video=false");
    parts.push("audio=true");
  } else if (audio.disabled) {
    parts.push("audio=false");
    return;
  } else {
    parts.push("audio=true");
  }

  if (!audioActive) {
    return;
  }

  const { source, audioDup } = resolveAudioStreamParams(audio, mirror.deviceSdk);

  if (source) {
    parts.push(`audio_source=${source}`);
  }

  parts.push(`audio_dup=${audioDup}`);

  const bitRateKbps = Number(audio.bitRateKbps ?? 128);

  if (bitRateKbps > 0) {
    parts.push(`audio_bit_rate=${Math.round(bitRateKbps * 1000)}`);
  }

  const codec = String(audio.codec ?? "opus").trim().toLowerCase();

  if (codec) {
    parts.push(`audio_codec=${codec}`);
  }

  const encoder = String(audio.encoder ?? "").trim();

  if (encoder) {
    parts.push(`audio_encoder=${encoder}`);
  }
}

/**
 * @param {Record<string, any>} mirror
 */
export function buildStreamExtrasFromMirror(mirror = {}) {
  const video = mirror.video ?? {};
  const device = mirror.device ?? {};
  const screen = mirror.screen ?? {};
  const parts = [];

  appendAudioStreamExtras(parts, mirror);

  const orientation = video.displayOrientation ?? video.captureOrientation;
  const capture = captureOrientationServerValue(orientation);
  if (capture) {
    parts.push(`capture_orientation=${capture}`);
  }

  const crop = String(video.crop ?? "").trim();
  if (crop) {
    parts.push(`crop=${crop}`);
  }

  appendScreenStreamExtras(parts, screen);

  parts.push(`show_touches=${Boolean(device.showTouches)}`);

  if (device.turnScreenOff) {
    parts.push("turn_screen_off=true");
  }

  if (device.stayAwake) {
    parts.push("stay_awake=true");
  }

  if (device.keepActive) {
    parts.push("keep_active=true");
  }

  if (Number(device.screenOffTimeout) > 0) {
    parts.push(`screen_off_timeout=${Number(device.screenOffTimeout)}`);
  }

  parts.push(`power_on=${device.noPowerOn ? false : device.powerOn !== false}`);

  return parts.join(",");
}
