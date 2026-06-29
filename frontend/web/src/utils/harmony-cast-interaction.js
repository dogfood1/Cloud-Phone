import {
  mapClientToVideoLocal,
  normalizeRotationDeg,
} from "./canvas-rotation.js";
import { resolveEventClientXY } from "./scrcpy-cast-touch.js";
import { orientDisplaySizeToCanvas } from "./harmony-cast-options.js";

const passiveOpts = { passive: false };

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

/**
 * ECHO-style fit rect: map pointer within the letterboxed video area on screen.
 * Falls back to mapClientToVideoLocal when preview rotation is active.
 */
function mapClientToHarmonyVideoLocal(clientX, clientY, canvas, rotator) {
  const videoSize = { width: canvas.width, height: canvas.height };

  if (!videoSize.width || !videoSize.height) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  const deg = rotator ? normalizeRotationDeg(Number(rotator.dataset?.rotation || 0)) : 0;

  if (deg) {
    return mapClientToVideoLocal(clientX, clientY, canvas, videoSize, rotator);
  }

  const rect = canvas.getBoundingClientRect();
  const videoRatio = videoSize.width / videoSize.height;
  const displayRatio = rect.width / rect.height;

  let fitWidth = rect.width;
  let fitHeight = rect.height;
  let fitX = rect.left;
  let fitY = rect.top;

  if (videoRatio < displayRatio) {
    fitHeight = rect.height;
    fitWidth = fitHeight * videoRatio;
    fitX = rect.left + (rect.width - fitWidth) / 2;
  } else if (videoRatio > displayRatio) {
    fitWidth = rect.width;
    fitHeight = fitWidth / videoRatio;
    fitY = rect.top + (rect.height - fitHeight) / 2;
  }

  return {
    x: clientX - fitX,
    y: clientY - fitY,
    width: fitWidth,
    height: fitHeight,
  };
}

function mapDevicePoint(clientX, clientY, canvas, rotator, getDeviceDisplaySize) {
  if (!canvas.width || !canvas.height) {
    return { x: 0, y: 0 };
  }

  const local = mapClientToHarmonyVideoLocal(clientX, clientY, canvas, rotator);
  const nx = clamp01(local.x / (local.width || 1));
  const ny = clamp01(local.y / (local.height || 1));
  const deviceSize = orientDisplaySizeToCanvas(getDeviceDisplaySize?.() ?? null, canvas);

  return {
    x: Math.round(nx * deviceSize.width),
    y: Math.round(ny * deviceSize.height),
  };
}

/**
 * ECHO/hdckit-style real-time touch: touchDown on press, touchMove while dragging, touchUp on release.
 * Device coordinates follow displayed canvas scale and native device resolution.
 *
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   sendMessage: (payload: object) => void,
 *   getRotator?: () => HTMLElement | null,
 *   getDeviceDisplaySize?: () => { width: number, height: number } | null,
 *   interactionEnabled?: boolean,
 * }} options
 */
export function attachHarmonyCastInteraction(options) {
  const {
    canvas,
    sendMessage,
    getRotator = () => null,
    getDeviceDisplaySize = () => null,
    interactionEnabled = true,
  } = options;

  if (!interactionEnabled) {
    return () => {};
  }

  let isTouching = false;

  const mapPoint = (event) => {
    const { clientX, clientY } = resolveEventClientXY(event, canvas);
    return mapDevicePoint(clientX, clientY, canvas, getRotator(), getDeviceDisplaySize);
  };

  const onPointerDown = (event) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    const point = mapPoint(event);
    isTouching = true;

    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }

    sendMessage({ type: "touchDown", x: point.x, y: point.y });
  };

  const onPointerMove = (event) => {
    if (!isTouching) {
      return;
    }

    event.preventDefault();
    const point = mapPoint(event);
    sendMessage({ type: "touchMove", x: point.x, y: point.y });
  };

  const onTouchEnd = (event) => {
    if (!isTouching) {
      return;
    }

    event.preventDefault();
    const point = mapPoint(event);
    isTouching = false;
    sendMessage({ type: "touchUp", x: point.x, y: point.y });

    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  };

  canvas.addEventListener("pointerdown", onPointerDown, passiveOpts);
  canvas.addEventListener("pointermove", onPointerMove, passiveOpts);
  canvas.addEventListener("pointerup", onTouchEnd, passiveOpts);
  canvas.addEventListener("pointercancel", onTouchEnd, passiveOpts);
  canvas.addEventListener("pointerleave", onTouchEnd, passiveOpts);

  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown, passiveOpts);
    canvas.removeEventListener("pointermove", onPointerMove, passiveOpts);
    canvas.removeEventListener("pointerup", onTouchEnd, passiveOpts);
    canvas.removeEventListener("pointercancel", onTouchEnd, passiveOpts);
    canvas.removeEventListener("pointerleave", onTouchEnd, passiveOpts);
  };
}
