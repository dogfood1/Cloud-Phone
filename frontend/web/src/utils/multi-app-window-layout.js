/** Taskbar height in multi-app desktop (see windows-desktop.css). */
export const TASKBAR_H = 48;
export const TITLE_BAR_H = 36;

export const VD_PORTRAIT = { width: 1080, height: 1920 };
export const VD_LANDSCAPE = { width: 1920, height: 1080 };

const MIN_W = 240;
const MIN_H = 320;
const EDGE_GAP = 10;

/**
 * @param {"portrait" | "landscape"} orientation
 */
export function resolveVdSize(orientation) {
  return orientation === "landscape" ? { ...VD_LANDSCAPE } : { ...VD_PORTRAIT };
}

/**
 * Default window bounds: docked above the bottom taskbar, smaller than the
 * available desktop area (scaled preview of the fixed 1080p/1920 VD).
 * @param {{ canvasWidth: number, canvasHeight: number, windowIndex?: number }} desktop
 * @param {"portrait" | "landscape"} orientation
 */
export function defaultWindowBounds(desktop, orientation = "portrait") {
  const canvasW = Math.max(desktop.canvasWidth || 800, 480);
  const canvasH = Math.max(desktop.canvasHeight || 600, 400);
  const availH = Math.max(MIN_H + TITLE_BAR_H, canvasH - TASKBAR_H - EDGE_GAP);
  const availW = Math.max(MIN_W, canvasW - EDGE_GAP * 2);
  const vd = resolveVdSize(orientation);
  const aspect = vd.width / vd.height;

  // Keep window clearly smaller than the desktop strip above the taskbar.
  let height = Math.min(Math.round(availH * 0.62), Math.round(availH - 16));
  let width = Math.round((height - TITLE_BAR_H) * aspect);
  if (width > availW) {
    width = availW;
    height = Math.round(width / aspect) + TITLE_BAR_H;
  }
  if (height > availH) {
    height = availH;
    width = Math.round((height - TITLE_BAR_H) * aspect);
  }
  width = Math.max(MIN_W, width);
  height = Math.max(MIN_H + TITLE_BAR_H, height);

  const offset = (Math.max(0, desktop.windowIndex || 0) % 5) * 22;
  const x = Math.max(EDGE_GAP, Math.min(availW - width, Math.round((canvasW - width) / 2) + offset));
  // Sit in the lower desktop area, just above the taskbar.
  const y = Math.max(EDGE_GAP, canvasH - TASKBAR_H - height - EDGE_GAP - (offset % 18));

  return {
    x,
    y,
    width,
    height,
    vdWidth: vd.width,
    vdHeight: vd.height,
  };
}
