import { createDefaultMirrorSettings } from "../utils/mirror-cast-defaults.js";
import { buildCastPayloadFromMirrorSettings } from "../utils/build-cast-payload.js";
import { NEW_DISPLAY_CUSTOM } from "../utils/mirror-screen-constants.js";
import { resolveVdFromContent, resolveVdSize } from "./multi-app-window-layout.js";
import { suggestDpi } from "./mirror-cast-constants.js";

/**
 * Multi-app cast options: one shared scrcpy-server (web :8886) + per-window
 * WebSocket / virtual display / start_app (Cloud Phone original design).
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

  settings.screen.useNewDisplay = true;
  settings.screen.newDisplaySelect = NEW_DISPLAY_CUSTOM;
  settings.screen.newDisplayWidth = width;
  settings.screen.newDisplayHeight = height;
  settings.screen.newDisplayDpi = dpi;
  settings.screen.newDisplayDpiManual = true;
  settings.screen.flexDisplay = true;
  settings.screen.newDisplayApp = packageName;
  settings.screen.noVdSystemDecorations = true;
  // Keep app content across VD resize / soft reset (avoid blank→exit-watch close).
  settings.screen.noVdDestroyContent = true;
  // Align with official scrcpy server defaults (8Mbps / I=10s), not mirror UI 5Mbps.
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
