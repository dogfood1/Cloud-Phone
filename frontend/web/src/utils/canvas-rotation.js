/** Clockwise preview rotation in 90° steps (0–270). */
export function nextPreviewRotationDeg(current) {
  const deg = Number(current) || 0;
  return (deg + 90) % 360;
}

export function normalizeRotationDeg(degrees) {
  const deg = Number(degrees) || 0;
  return ((deg % 360) + 360) % 360;
}

function rotatePointInverse(x, y, width, height, deg) {
  if (!deg) {
    return { x, y, width, height };
  }

  const cx = width / 2;
  const cy = height / 2;
  const dx = x - cx;
  const dy = y - cy;

  let rdx = dx;
  let rdy = dy;

  switch (deg) {
    case 90:
      // Inverse of rotate(90deg) is rotate(-90deg): (x, y) -> (y, -x)
      rdx = dy;
      rdy = -dx;
      break;
    case 180:
      rdx = -dx;
      rdy = -dy;
      break;
    case 270:
      // Inverse of rotate(270deg) is rotate(-270deg)=rotate(90deg): (x, y) -> (-y, x)
      rdx = -dy;
      rdy = dx;
      break;
    default:
      break;
  }

  const unrotatedWidth = deg === 90 || deg === 270 ? height : width;
  const unrotatedHeight = deg === 90 || deg === 270 ? width : height;

  return {
    x: rdx + unrotatedWidth / 2,
    y: rdy + unrotatedHeight / 2,
    width: unrotatedWidth,
    height: unrotatedHeight,
  };
}

/**
 * Rotate preview wrapper (not the canvas bitmap) so WebCodecs layout is unaffected.
 * For 90°/270° we swap rotator width/height to match the viewport so the canvas
 * resizes (via ResizeObserver) instead of shrinking with a CSS scale transform.
 * @param {HTMLElement | null} rotator
 * @param {HTMLElement | null} viewport parent used to measure available space
 */
export function applyStagePreviewRotation(rotator, degrees, viewport = null) {
  if (!rotator) {
    return;
  }

  const deg = normalizeRotationDeg(degrees);
  rotator.dataset.rotation = String(deg);
  const parent = viewport ?? rotator.parentElement;

  rotator.style.transformOrigin = "center center";

  if (!deg) {
    rotator.style.position = "";
    rotator.style.inset = "";
    rotator.style.flex = "";
    rotator.style.width = "";
    rotator.style.height = "";
    rotator.style.transform = "";
    return;
  }

  if (parent && (deg === 90 || deg === 270)) {
    const pw = Math.max(1, parent.clientWidth);
    const ph = Math.max(1, parent.clientHeight);
    // Prevent flexbox from shrinking the "pre-rotated" layout box.
    // We size the box as (ph x pw) so after rotate(90) it fits (pw x ph).
    rotator.style.position = "absolute";
    rotator.style.inset = "50% auto auto 50%";
    rotator.style.flex = "0 0 auto";
    rotator.style.width = `${ph}px`;
    rotator.style.height = `${pw}px`;
    rotator.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;
    return;
  }

  rotator.style.position = "";
  rotator.style.inset = "";
  rotator.style.flex = "";
  rotator.style.width = "";
  rotator.style.height = "";
  rotator.style.transform = `rotate(${deg}deg)`;
}

/**
 * Crop pointer to the active video area inside the canvas (letterboxing), like ws-scrcpy
 * InteractionHandler.buildTouchOnClient.
 */
export function mapClientToVideoLocal(clientX, clientY, canvas, videoSize, rotator = null) {
  const rect = canvas.getBoundingClientRect();
  const deg = rotator ? normalizeRotationDeg(Number(rotator.dataset?.rotation || 0)) : 0;

  const rawWidth = Math.max(1, rect.width || canvas.clientWidth || 1);
  const rawHeight = Math.max(1, rect.height || canvas.clientHeight || 1);

  const rotatedLocalX = clientX - rect.left;
  const rotatedLocalY = clientY - rect.top;

  const inv = rotatePointInverse(rotatedLocalX, rotatedLocalY, rawWidth, rawHeight, deg);

  let touchX = inv.x;
  let touchY = inv.y;
  let clientWidth = inv.width || 1;
  let clientHeight = inv.height || 1;
  const { width: videoWidth, height: videoHeight } = videoSize;

  if (!videoWidth || !videoHeight) {
    return { x: touchX, y: touchY, width: clientWidth, height: clientHeight };
  }

  const ratio = videoWidth / videoHeight;
  const eps = 1e5;
  const shouldBe = Math.round(eps * ratio);
  const haveNow = Math.round((eps * clientWidth) / clientHeight);

  if (shouldBe > haveNow) {
    const realHeight = Math.ceil(clientWidth / ratio);
    const top = (clientHeight - realHeight) / 2;
    touchY -= top;
    clientHeight = realHeight;
  } else if (shouldBe < haveNow) {
    const realWidth = Math.ceil(clientHeight * ratio);
    const left = (clientWidth - realWidth) / 2;
    touchX -= left;
    clientWidth = realWidth;
  }

  return { x: touchX, y: touchY, width: clientWidth, height: clientHeight };
}

/**
 * Map screen coordinates to normalized [0,1] on the unrotated canvas.
 * Uses inverse of the rotator CSS rotation, then crops letterboxing.
 */
export function clientToCanvasNormalized(event, canvas, rotator = null, videoSize = null) {
  const size = videoSize ?? { width: canvas.clientWidth || 1, height: canvas.clientHeight || 1 };
  const local = mapClientToVideoLocal(event.clientX, event.clientY, canvas, size, rotator);
  let nx = local.x / (local.width || 1);
  let ny = local.y / (local.height || 1);

  return { nx, ny };
}

/**
 * Map a pointer on the preview stage to device pixel coordinates.
 */
export function mapTouchToDevicePoint(event, canvas, screenSize, _rotationDeg, rotator = null) {
  if (!screenSize.width || !screenSize.height) {
    return { x: 0, y: 0 };
  }

  const { nx, ny } = clientToCanvasNormalized(event, canvas, rotator, screenSize);

  return {
    x: Math.round(Math.min(1, Math.max(0, nx)) * screenSize.width),
    y: Math.round(Math.min(1, Math.max(0, ny)) * screenSize.height),
  };
}
