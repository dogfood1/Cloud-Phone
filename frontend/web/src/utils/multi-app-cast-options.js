import { createDefaultMirrorSettings } from "../utils/mirror-cast-defaults.js";
import { buildCastPayloadFromMirrorSettings } from "../utils/build-cast-payload.js";
import { NEW_DISPLAY_CUSTOM } from "../utils/mirror-screen-constants.js";
import { resolveVdSize } from "./multi-app-window-layout.js";

/**
 * Build cast options for multi-app virtual display session.
 * Default VD is 1080×1920 (portrait) or 1920×1080 (landscape).
 * @param {{
 *   width?: number,
 *   height?: number,
 *   packageName?: string,
 *   deviceSdk?: number,
 *   orientation?: "portrait" | "landscape",
 * }} opts
 */
export function buildMultiAppCastOptions(opts) {
  const settings = createDefaultMirrorSettings();
  const orientation = opts.orientation === "landscape" ? "landscape" : "portrait";
  const vd = resolveVdSize(orientation);
  const width = Math.max(240, Math.round(Number(opts.width) || vd.width));
  const height = Math.max(320, Math.round(Number(opts.height) || vd.height));
  const packageName = String(opts.packageName || "").trim();

  settings.screen.useNewDisplay = true;
  settings.screen.newDisplaySelect = NEW_DISPLAY_CUSTOM;
  settings.screen.newDisplayWidth = width;
  settings.screen.newDisplayHeight = height;
  settings.screen.newDisplayDpi = 320;
  settings.screen.newDisplayDpiManual = true;
  // Keep fixed VD resolution; window only scales the video preview.
  settings.screen.flexDisplay = false;
  settings.screen.newDisplayApp = packageName;
  settings.screen.noVdSystemDecorations = true;
  settings.video.maxFps = 60;
  // Avoid fighting over device audio when multiple windows each own a VD.
  settings.audio.disabled = true;

  return buildCastPayloadFromMirrorSettings(settings, Number(opts.deviceSdk) || 0);
}
