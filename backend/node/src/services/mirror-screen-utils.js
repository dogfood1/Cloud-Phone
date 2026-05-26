const NEW_DISPLAY_OFF = "";
const NEW_DISPLAY_MAIN = "__main__";
const NEW_DISPLAY_CUSTOM = "__custom__";

/**
 * @param {string} select
 */
function isNewDisplaySelectActive(select) {
  const value = String(select ?? "");

  return value !== "" && value !== NEW_DISPLAY_OFF;
}

/**
 * @param {Record<string, unknown>} screen
 */
function isNewDisplayEnabled(screen = {}) {
  return Boolean(screen.useNewDisplay) || isNewDisplaySelectActive(screen.newDisplaySelect);
}

/**
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
 * @param {string[]} parts
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

  const startApp = String(screen.newDisplayApp ?? "").trim();

  if (startApp) {
    parts.push(`start_app=${startApp}`);
  }
}
