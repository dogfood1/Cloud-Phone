/** Clockwise preview rotation in 90° steps (0–270). */
export function nextPreviewRotationDeg(current) {
  const deg = Number(current) || 0;
  return (deg + 90) % 360;
}

export function normalizeRotationDeg(degrees) {
  const deg = Number(degrees) || 0;
  return ((deg % 360) + 360) % 360;
}

/**
 * Rotate preview wrapper (not the canvas bitmap) so WebCodecs layout is unaffected.
 * @param {HTMLElement | null} rotator
 * @param {HTMLElement | null} viewport parent for 90°/270° scale-to-fit
 */
export function applyStagePreviewRotation(rotator, degrees, viewport = null) {
  if (!rotator) {
    return;
  }

  const deg = normalizeRotationDeg(degrees);
  rotator.dataset.rotation = String(deg);

  if (!deg) {
    rotator.style.transform = "";
    return;
  }

  const parent = viewport ?? rotator.parentElement;
  let scale = 1;

  if (parent && (deg === 90 || deg === 270)) {
    const pw = parent.clientWidth || 1;
    const ph = parent.clientHeight || 1;
    scale = Math.min(pw / ph, ph / pw);
  }

  rotator.style.transformOrigin = "center center";
  rotator.style.transform =
    scale < 1 ? `rotate(${deg}deg) scale(${scale})` : `rotate(${deg}deg)`;
}

/**
 * Map a pointer on a CSS-rotated preview to device pixel coordinates.
 */
export function mapTouchToDevicePoint(event, canvas, screenSize, rotationDeg) {
  const rect = canvas.getBoundingClientRect();

  if (!rect.width || !rect.height || !screenSize.width || !screenSize.height) {
    return { x: 0, y: 0 };
  }

  let nx = (event.clientX - rect.left) / rect.width;
  let ny = (event.clientY - rect.top) / rect.height;

  switch (normalizeRotationDeg(rotationDeg)) {
    case 90:
      [nx, ny] = [ny, 1 - nx];
      break;
    case 180:
      nx = 1 - nx;
      ny = 1 - ny;
      break;
    case 270:
      [nx, ny] = [1 - ny, nx];
      break;
    default:
      break;
  }

  return {
    x: Math.round(Math.min(1, Math.max(0, nx)) * screenSize.width),
    y: Math.round(Math.min(1, Math.max(0, ny)) * screenSize.height),
  };
}
