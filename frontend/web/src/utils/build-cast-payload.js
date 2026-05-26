import { createDefaultMirrorSettings } from "./mirror-cast-defaults.js";
import { maxSizeFromMirrorVideo } from "./mirror-video-config.js";

export function buildCastPayloadFromMirrorSettings(settings = createDefaultMirrorSettings()) {
  const maxSize = maxSizeFromMirrorVideo(settings.video);

  return {
    maxSize,
    mirror: settings,
    video: !settings.video.disabled,
    control: true,
    audio: !settings.audio.disabled,
  };
}
