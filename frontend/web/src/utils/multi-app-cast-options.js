import { createDefaultMirrorSettings } from "../utils/mirror-cast-defaults.js";
import { buildCastPayloadFromMirrorSettings } from "../utils/build-cast-payload.js";
import { NEW_DISPLAY_CUSTOM } from "../utils/mirror-screen-constants.js";

/**
 * Build cast options for multi-app virtual display session.
 * @param {{ width: number, height: number, packageName?: string, deviceSdk?: number }} opts
 */
export function buildMultiAppCastOptions(opts) {
  const settings = createDefaultMirrorSettings();
  const width = Math.max(240, Math.round(Number(opts.width) || 420));
  const height = Math.max(320, Math.round(Number(opts.height) || 760));
  const packageName = String(opts.packageName || "").trim();

  settings.screen.useNewDisplay = true;
  settings.screen.newDisplaySelect = NEW_DISPLAY_CUSTOM;
  settings.screen.newDisplayWidth = width;
  settings.screen.newDisplayHeight = height;
  settings.screen.newDisplayDpi = 320;
  settings.screen.newDisplayDpiManual = true;
  settings.screen.flexDisplay = true;
  settings.screen.newDisplayApp = packageName;
  settings.screen.noVdSystemDecorations = true;
  settings.video.maxFps = 60;
  // Avoid fighting over device audio when multiple windows each own a VD.
  settings.audio.disabled = true;

  return buildCastPayloadFromMirrorSettings(settings, Number(opts.deviceSdk) || 0);
}
