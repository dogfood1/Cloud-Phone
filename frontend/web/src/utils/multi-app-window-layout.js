import { suggestDpi } from "./mirror-cast-constants.js";

/** Taskbar height in multi-app desktop (see windows-desktop.css). */
export const TASKBAR_H = 48;
export const TITLE_BAR_H = 36;

export const VD_PORTRAIT = { width: 1080, height: 1920 };
export const VD_LANDSCAPE = { width: 1920, height: 1080 };

const MIN_W = 240;
const MIN_H = 320;
const EDGE_GAP = 8;

/**
 * @param {"portrait" | "landscape"} orientation
 */
export function resolveVdSize(orientation) {
  return orientation === "landscape" ? { ...VD_LANDSCAPE } : { ...VD_PORTRAIT };
}

/**
 * Align to even pixels (encoder / VD friendly).
 * @param {number} value
 */
export function alignEven(value) {
  const n = Math.max(1, Math.round(Number(value) || 1));
  return n & ~1;
}

/**
 * Map window content aspect → stable 1080p-class virtual display (like desktop scrcpy).
 * Window is only a scaled viewport; encode size stays near 1920×1080 / 1080×1920.
 * @param {number} contentW
 * @param {number} contentH
 */
export function resolveVdFromContent(contentW, contentH) {
  const cw = Math.max(1, Math.round(Number(contentW) || 1));
  const ch = Math.max(1, Math.round(Number(contentH) || 1));
  const aspect = cw / ch;

  if (aspect >= 1) {
    const width = 1920;
    const height = Math.max(320, alignEven(width / aspect));
    return { width, height, dpi: suggestDpi(width, height) };
  }

  const height = 1920;
  const width = Math.max(240, alignEven(height * aspect));
  return { width, height, dpi: suggestDpi(width, height) };
}

/**
 * Default window: height = canvas top → taskbar; width from 1920×1080 (or
 * 1080×1920) aspect of the content area.
 * @param {{ canvasWidth: number, canvasHeight: number, windowIndex?: number }} desktop
 * @param {"portrait" | "landscape"} orientation
 */
export function defaultWindowBounds(desktop, orientation = "portrait") {
  const canvasW = Math.max(desktop.canvasWidth || 800, 480);
  const canvasH = Math.max(desktop.canvasHeight || 600, 400);
  // Canvas is already the strip above the taskbar — fill it.
  const availH = Math.max(MIN_H + TITLE_BAR_H, canvasH);
  const availW = Math.max(MIN_W, canvasW - EDGE_GAP * 2);
  const vd = resolveVdSize(orientation);
  const aspect = vd.width / vd.height;

  let height = availH;
  let contentH = Math.max(MIN_H, height - TITLE_BAR_H);
  let width = Math.round(contentH * aspect);

  if (width > availW) {
    width = availW;
    contentH = Math.round(width / aspect);
    height = contentH + TITLE_BAR_H;
  }

  width = Math.max(MIN_W, width);
  height = Math.max(MIN_H + TITLE_BAR_H, Math.min(availH, height));

  const offset = (Math.max(0, desktop.windowIndex || 0) % 5) * 24;
  const x = Math.max(
    EDGE_GAP,
    Math.min(canvasW - width - EDGE_GAP, Math.round((canvasW - width) / 2) + offset),
  );
  // Flush to the top of the desktop strip (sits above the taskbar).
  const y = Math.max(0, Math.min(EDGE_GAP + (offset % 12), Math.max(0, availH - height)));

  const contentW = width;
  contentH = Math.max(MIN_H, height - TITLE_BAR_H);
  // Prefer canonical 1080p/1920 VD (same as desktop scrcpy), not content pixels.
  const vdSize = resolveVdSize(orientation);
  const dpi = suggestDpi(vdSize.width, vdSize.height);

  return {
    x,
    y,
    width,
    height,
    vdWidth: vdSize.width,
    vdHeight: vdSize.height,
    vdDpi: dpi,
  };
}
