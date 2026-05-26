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
 * Crop pointer to the active video area inside the canvas (letterboxing), like ws-scrcpy
 * InteractionHandler.buildTouchOnClient.
 */
export function mapClientToVideoLocal(clientX, clientY, canvas, videoSize) {
  const rect = canvas.getBoundingClientRect();
  let touchX = clientX - rect.left;
  let touchY = clientY - rect.top;
  let clientWidth = canvas.clientWidth || rect.width || 1;
  let clientHeight = canvas.clientHeight || rect.height || 1;
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
 * Uses inverse of the rotator CSS transform (rotate + scale).
 */
export function clientToCanvasNormalized(event, canvas, rotator = null, videoSize = null) {
  const wrapper = rotator ?? canvas.parentElement;
  const deg = wrapper ? normalizeRotationDeg(Number(wrapper.dataset?.rotation || 0)) : 0;
  const size = videoSize ?? { width: canvas.clientWidth || 1, height: canvas.clientHeight || 1 };
  const local = mapClientToVideoLocal(event.clientX, event.clientY, canvas, size);
  let nx = local.x / (local.width || 1);
  let ny = local.y / (local.height || 1);

  switch (deg) {
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
