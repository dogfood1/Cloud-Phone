import { createDefaultMirrorSettings } from "./mirror-cast-defaults.js";
import { maxSizeFromMirrorVideo } from "./mirror-video-config.js";

export function buildCastPayloadFromMirrorSettings(
  settings = createDefaultMirrorSettings(),
  deviceSdk = 0,
) {
  const maxSize = maxSizeFromMirrorVideo(settings.video);
  const videoDisabled = settings.video?.disabled === true;

  return {
    maxSize,
    mirror: { ...settings, deviceSdk },
    deviceSdk,
    video: !videoDisabled,
    control: true,
    audio: videoDisabled ? true : !settings.audio.disabled,
  };
}
