import { createDefaultMirrorSettings } from "./mirror-cast-defaults.js";

const RESOLUTION_MAX_SIZE = {
  "720p": 720,
  "1080p": 1080,
  "1440p": 1440,
  "4k": 2160,
};

export function buildCastPayloadFromMirrorSettings(settings = createDefaultMirrorSettings()) {
  const maxSize = RESOLUTION_MAX_SIZE[settings.video.resolution] ?? 1024;

  return {
    maxSize,
    mirror: settings,
    video: !settings.video.disabled,
    control: true,
    audio: !settings.audio.disabled,
  };
}
