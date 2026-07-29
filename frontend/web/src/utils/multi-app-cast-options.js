import { createDefaultMirrorSettings } from "../utils/mirror-cast-defaults.js";
import { buildCastPayloadFromMirrorSettings } from "../utils/build-cast-payload.js";
import { NEW_DISPLAY_CUSTOM } from "../utils/mirror-screen-constants.js";
import { resolveVdFromContent, resolveVdSize } from "./multi-app-window-layout.js";
import { suggestDpi } from "./mirror-cast-constants.js";

/**
 * Build cast options equivalent to official scrcpy:
 *   scrcpy --new-display=<W>x<H>/<dpi> --start-app=<pkg> --flex-display
 *           --no-vd-system-decorations --no-vd-destroy-content
 *
 * One device-wide scrcpy-server (web :8886); each window sends its own
 * type-101 new_display + start_app over a dedicated WebSocket.
 *
 * @param {{
 *   width?: number,
 *   height?: number,
 *   dpi?: number,
 *   packageName?: string,
 *   deviceSdk?: number,
 *   orientation?: "portrait" | "landscape",
 * }} opts
 */
export function buildMultiAppCastOptions(opts) {
  const settings = createDefaultMirrorSettings();
  const orientation = opts.orientation === "landscape" ? "landscape" : "portrait";
  const fallback = resolveVdSize(orientation);
  const width = Math.max(240, Math.round(Number(opts.width) || fallback.width));
  const height = Math.max(320, Math.round(Number(opts.height) || fallback.height));
  const dpi = Math.max(
    120,
    Math.min(640, Math.round(Number(opts.dpi) || suggestDpi(width, height))),
  );
  const packageName = String(opts.packageName || "").trim();

  // --new-display=WxH/dpi
  settings.screen.useNewDisplay = true;
  settings.screen.newDisplaySelect = NEW_DISPLAY_CUSTOM;
  settings.screen.newDisplayWidth = width;
  settings.screen.newDisplayHeight = height;
  settings.screen.newDisplayDpi = dpi;
  settings.screen.newDisplayDpiManual = true;
  // --start-app=<pkg> (launched when VD id is known)
  settings.screen.newDisplayApp = packageName;
  // --flex-display / --no-vd-system-decorations / --no-vd-destroy-content
  settings.screen.flexDisplay = true;
  settings.screen.noVdSystemDecorations = true;
  settings.screen.noVdDestroyContent = true;
  // Official server defaults (not mirror UI 5Mbps)
  settings.video.maxFps = 60;
  settings.video.bitRateMbps = 8;
  settings.video.iFrameInterval = 10;
  settings.video.resolution = "1080p";
  settings.audio.disabled = true;

  return buildCastPayloadFromMirrorSettings(settings, Number(opts.deviceSdk) || 0);
}

/**
 * @param {number} contentW
 * @param {number} contentH
 */
export function vdOptionsFromContent(contentW, contentH) {
  return resolveVdFromContent(contentW, contentH);
}
