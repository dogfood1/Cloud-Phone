const RESOLUTION_MAX_SIZE = {
  "720p": 720,
  "1080p": 1080,
  "1440p": 1440,
  "4k": 2160,
};

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

  const maxSize =
    Number(input.maxSize) ||
    RESOLUTION_MAX_SIZE[video.resolution] ||
    RESOLUTION_MAX_SIZE["1080p"];

  const videoBitRateMbps = Number(video.bitRateMbps ?? input.videoBitRateMbps ?? 8);

  return {
    maxSize,
    videoCodec: String(video.encoder || input.videoCodec || "h264").toLowerCase(),
    videoBitRate: Math.round(videoBitRateMbps * 1_000_000),
    maxFps: Number(video.maxFps ?? input.maxFps ?? 60),
    video: video.disabled !== true && input.video !== false,
    audio: audio.disabled !== true && input.audio === true,
    control: input.control !== false,
    audioSource: String(audio.source ?? "output"),
    audioBitRate: Number(audio.bitRateKbps ?? 128) * 1000,
    showTouches: Boolean(device.showTouches),
    stayAwake: Boolean(device.stayAwake),
    turnScreenOff: Boolean(device.turnScreenOff),
    powerOn: device.powerOn !== false,
    displayId: screen.displayId ? Number(screen.displayId) : undefined,
    captureOrientation: video.captureOrientation,
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
  );

  return features;
}
