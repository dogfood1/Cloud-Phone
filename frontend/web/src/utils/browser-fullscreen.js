/**
 * Browser Fullscreen API helpers (hide chrome / address bar).
 */

export function getFullscreenElement() {
  if (typeof document === "undefined") {
    return null;
  }
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

/**
 * @param {Element | null | undefined} el
 */
export function isBrowserFullscreenFor(el) {
  const fs = getFullscreenElement();
  if (!fs) {
    return false;
  }
  if (!el) {
    return fs === document.documentElement || fs === document.body;
  }
  return fs === el || fs === document.documentElement || fs === document.body || el.contains(fs);
}

/**
 * @param {Element} el
 * @returns {Promise<void>}
 */
export function requestBrowserFullscreen(el) {
  const target = el || (typeof document !== "undefined" ? document.documentElement : null);
  if (!target) {
    return Promise.reject(new Error("fullscreen_no_target"));
  }
  const req =
    target.requestFullscreen ||
    target.webkitRequestFullscreen ||
    target.webkitRequestFullScreen;
  if (typeof req !== "function") {
    return Promise.reject(new Error("fullscreen_unsupported"));
  }
  // navigationUI: "hide" asks the browser to hide address / nav chrome.
  try {
    const result = req.call(target, { navigationUI: "hide" });
    return Promise.resolve(result).catch(() => Promise.resolve(req.call(target)));
  } catch {
    return Promise.resolve(req.call(target));
  }
}

/**
 * @returns {Promise<void>}
 */
export function exitBrowserFullscreen() {
  if (typeof document === "undefined") {
    return Promise.resolve();
  }
  const exit =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.webkitCancelFullScreen;
  if (typeof exit !== "function") {
    return Promise.resolve();
  }
  return Promise.resolve(exit.call(document)).catch(() => {});
}

/**
 * Toggle element (or documentElement) into true browser fullscreen.
 * Call synchronously from a user gesture (click / pointerdown).
 * @param {Element | null | undefined} el
 */
export function toggleBrowserFullscreen(el) {
  const target =
    el || (typeof document !== "undefined" ? document.documentElement : null);
  if (!target) {
    return Promise.reject(new Error("fullscreen_no_target"));
  }
  if (isBrowserFullscreenFor(target)) {
    return exitBrowserFullscreen();
  }
  return requestBrowserFullscreen(target);
}
