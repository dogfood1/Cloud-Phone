import { resolveAudioStreamParams } from "./mirror-audio-platform.js";

/**
 * scrcpy camera mode stream extras (WebSocket type 101 → Options.applyVideoStreamExtras).
 * @param {Record<string, any>} mirror
 */
export function buildStreamExtrasFromCamera(mirror = {}) {
  const camera = mirror.camera ?? {};
  const audio = mirror.audio ?? {};
  const parts = ["video_source=camera"];

  if (audio.disabled) {
    parts.push("audio=false");
  } else {
    parts.push("audio=true");
    const { source, audioDup } = resolveAudioStreamParams(
      { ...audio, source: audio.source || "mic" },
      mirror.deviceSdk,
    );

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

  const cameraId = String(camera.cameraId ?? "").trim();

  if (cameraId) {
    parts.push(`camera_id=${cameraId}`);
  } else {
    const facing = String(camera.facing ?? "").trim();

    if (facing) {
      parts.push(`camera_facing=${facing}`);
    }
  }

  const size = String(camera.size ?? "").trim();

  if (size) {
    parts.push(`camera_size=${size}`);
  } else {
    const ar = String(camera.aspectRatio ?? "").trim();

    if (ar) {
      parts.push(`camera_ar=${ar}`);
    }
  }

  const fps = Number(camera.fps ?? 0);

  if (fps > 0) {
    parts.push(`camera_fps=${Math.round(fps)}`);
  }

  if (camera.highSpeed) {
    parts.push("camera_high_speed=true");
  }

  if (camera.torch) {
    parts.push("camera_torch=true");
  }

  const zoom = Number(camera.zoom ?? 1);

  if (zoom > 0 && zoom !== 1) {
    parts.push(`camera_zoom=${zoom}`);
  }

  parts.push("power_on=false");

  return parts.join(",");
}
