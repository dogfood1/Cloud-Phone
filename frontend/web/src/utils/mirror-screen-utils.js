import {
  NEW_DISPLAY_CUSTOM,
  NEW_DISPLAY_MAIN,
  NEW_DISPLAY_OFF,
  NEW_DISPLAY_PRESETS,
} from "./mirror-screen-constants.js";
import { suggestDpi } from "./mirror-cast-constants.js";

/**
 * @param {Record<string, unknown>} screen
 */
export function isNewDisplayEnabled(screen = {}) {
  return Boolean(screen.useNewDisplay) || isNewDisplaySelectActive(screen.newDisplaySelect);
}

/**
 * @param {string} select
 */
export function isNewDisplaySelectActive(select) {
  const value = String(select ?? "");

  return value !== "" && value !== NEW_DISPLAY_OFF;
}

/**
 * @param {string} presetValue
 */
export function findNewDisplayPreset(presetValue) {
  return NEW_DISPLAY_PRESETS.find((item) => item.value === presetValue) ?? null;
}

/**
 * @param {Record<string, unknown>} screen
 * @param {string} selectValue
 */
export function applyNewDisplaySelect(screen, selectValue) {
  const value = String(selectValue ?? "");

  screen.newDisplaySelect = value;

  if (value === NEW_DISPLAY_OFF || value === "") {
    screen.useNewDisplay = false;
    return;
  }

  screen.useNewDisplay = true;

  if (value === NEW_DISPLAY_MAIN) {
    return;
  }

  if (value === NEW_DISPLAY_CUSTOM) {
    return;
  }

  const preset = findNewDisplayPreset(value);

  if (preset) {
    screen.newDisplayWidth = preset.width;
    screen.newDisplayHeight = preset.height;
    screen.newDisplayDpi = preset.dpi;
    screen.newDisplayDpiManual = true;
  }
}

/**
 * scrcpy-server new_display extra value.
 * @param {Record<string, unknown>} screen
 */
export function formatNewDisplayExtra(screen = {}) {
  if (!isNewDisplayEnabled(screen)) {
    return "";
  }

  const select = String(screen.newDisplaySelect ?? "");

  if (select === NEW_DISPLAY_MAIN) {
    return "";
  }

  if (
    select &&
    select !== NEW_DISPLAY_CUSTOM &&
    select.includes("x") &&
    select.includes("/")
  ) {
    return select;
  }

  const w = Number(screen.newDisplayWidth) || 1920;
  const h = Number(screen.newDisplayHeight) || 1080;
  const dpi = Number(screen.newDisplayDpi) || 420;

  return `${w}x${h}/${dpi}`;
}

/**
 * Package / scrcpy --start-app selector saved in mirror screen settings.
 * @param {Record<string, unknown>} screen
 */
export function resolveStartAppPackage(screen = {}) {
  return String(screen.newDisplayApp ?? "").trim();
}

/**
 * @param {Record<string, unknown>} screen
 */
export function appendScreenStreamExtras(parts, screen = {}) {
  if (isNewDisplayEnabled(screen)) {
    parts.push(`new_display=${formatNewDisplayExtra(screen)}`);
  } else if (screen.displayId !== undefined && screen.displayId !== "") {
    parts.push(`display_id=${Number(screen.displayId) || 0}`);
  }

  if (screen.flexDisplay) {
    parts.push("flex_display=true");
  }

  if (screen.noVdDestroyContent) {
    parts.push("vd_destroy_content=false");
  }

  if (screen.noVdSystemDecorations) {
    parts.push("vd_system_decorations=false");
  }

  const imePolicy = String(screen.displayImePolicy ?? "").trim();

  if (imePolicy) {
    parts.push(`display_ime_policy=${imePolicy}`);
  }

  const startApp = resolveStartAppPackage(screen);

  if (startApp) {
    parts.push(`start_app=${startApp}`);
  }
}

export function ensureSuggestedDpi(screen) {
  if (screen.newDisplayDpiManual) {
    return;
  }

  screen.newDisplayDpi = suggestDpi(screen.newDisplayWidth, screen.newDisplayHeight);
}
