import { createDefaultMirrorSettings } from "./mirror-cast-defaults.js";
import { createDefaultCameraSettings } from "./camera-cast-defaults.js";
import { maxSizeFromMirrorVideo } from "./mirror-video-config.js";

export function buildCastPayloadFromMirrorSettings(
  settings = createDefaultMirrorSettings(),
  deviceSdk = 0,
) {
  const maxSize = maxSizeFromMirrorVideo(settings.video);
  const videoDisabled = settings.video?.disabled === true;

  return {
    castMode: "mirror",
    maxSize,
    mirror: { ...settings, deviceSdk },
    deviceSdk,
    video: !videoDisabled,
    control: true,
    audio: videoDisabled ? true : !settings.audio.disabled,
  };
}

export function buildCastPayloadFromCameraSettings(
  settings = createDefaultCameraSettings(),
  deviceSdk = 0,
) {
  const maxSize = maxSizeFromMirrorVideo(settings.camera);

  return {
    castMode: "camera",
    maxSize,
    mirror: { ...settings, deviceSdk },
    deviceSdk,
    video: true,
    control: true,
    audio: !settings.audio.disabled,
  };
}
