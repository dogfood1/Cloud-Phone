import { captureOrientationServerValue } from "./mirror-video-config.js";

/**
 * Build server-side stream extras (comma-separated key=value) for Options.parse extras.
 * Transport: WebSocket type 101 → device scrcpy-server copyForWebStream().
 * @param {Record<string, any>} mirror
 */
export function buildStreamExtrasFromMirror(mirror = {}) {
  const video = mirror.video ?? {};
  const device = mirror.device ?? {};
  const screen = mirror.screen ?? {};
  const parts = [];

  const orientation = video.displayOrientation ?? video.captureOrientation;
  const capture = captureOrientationServerValue(orientation);
  if (capture) {
    parts.push(`capture_orientation=${capture}`);
  }

  const crop = String(video.crop ?? "").trim();
  if (crop) {
    parts.push(`crop=${crop}`);
  }

  if (screen.useNewDisplay) {
    const w = Number(screen.newDisplayWidth) || 1920;
    const h = Number(screen.newDisplayHeight) || 1080;
    const dpi = Number(screen.newDisplayDpi) || 420;
    parts.push(`new_display=${w}x${h}/${dpi}`);
  } else if (screen.displayId !== undefined && screen.displayId !== "") {
    // displayId sent via VideoSettings.displayId field
  }

  if (device.showTouches) {
    parts.push("show_touches=true");
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

  if (screen.flexDisplay) {
    parts.push("flex_display=true");
  }

  if (screen.noVdDestroyContent) {
    parts.push("vd_destroy_content=false");
  }

  const imePolicy = String(screen.displayImePolicy ?? "").trim();
  if (imePolicy) {
    parts.push(`display_ime_policy=${imePolicy}`);
  }

  return parts.join(",");
}
