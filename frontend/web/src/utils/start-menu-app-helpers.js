/**
 * Pure helpers for Start menu app list merging / display.
 */

/**
 * @param {Array<Record<string, unknown>>} previous
 * @param {Array<Record<string, unknown>>} next
 */
export function mergeAppIcons(previous, next) {
  const previousIcons = new Map(
    previous
      .filter((item) => item.iconDataUrl)
      .map((item) => [item.packageName, item.iconDataUrl]),
  );
  return next.map((item) => ({
    ...item,
    iconDataUrl: item.iconDataUrl || previousIcons.get(item.packageName) || null,
  }));
}

/**
 * @param {Record<string, unknown>} app
 */
export function appInitials(app) {
  return String(app.label || app.packageName || "?").trim().slice(0, 1).toUpperCase();
}

/**
 * @param {Record<string, unknown>} app
 * @param {boolean} packageNamesOnly
 */
export function appDisplayName(app, packageNamesOnly) {
  return packageNamesOnly ? app.packageName : app.label || app.packageName;
}

/**
 * @param {Record<string, unknown>} app
 * @param {boolean} packageNamesOnly
 */
export function appLaunchPayload(app, packageNamesOnly) {
  return {
    packageName: app.packageName,
    activity: app.activity,
    label: appDisplayName(app, packageNamesOnly),
    iconDataUrl: packageNamesOnly ? null : app.iconDataUrl || null,
  };
}
