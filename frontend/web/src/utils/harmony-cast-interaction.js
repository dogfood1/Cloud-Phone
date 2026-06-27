import { mapClientToVideoLocal } from "./canvas-rotation.js";

const passiveOpts = { passive: false };

function mapDevicePoint(clientX, clientY, canvas, nativeSize) {
  const videoSize = { width: canvas.width, height: canvas.height };

  if (!videoSize.width || !videoSize.height) {
    return { x: 0, y: 0 };
  }

  const local = mapClientToVideoLocal(clientX, clientY, canvas, videoSize, null);
  const canvasPoint = {
    x: Math.round((local.x / local.width) * canvas.width),
    y: Math.round((local.y / local.height) * canvas.height),
  };

  if (
    !nativeSize?.width ||
    !nativeSize?.height ||
    (canvas.width === nativeSize.width && canvas.height === nativeSize.height)
  ) {
    return canvasPoint;
  }

  return {
    x: Math.round((canvasPoint.x * nativeSize.width) / canvas.width),
    y: Math.round((canvasPoint.y * nativeSize.height) / canvas.height),
  };
}

/**
 * ECHO/hdckit-style real-time touch: touchDown on press, touchMove while dragging, touchUp on release.
 *
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   sendMessage: (payload: object) => void,
 *   nativeSize?: { width: number, height: number } | null,
 *   interactionEnabled?: boolean,
 * }} options
 */
export function attachHarmonyCastInteraction(options) {
  const { canvas, sendMessage, nativeSize = null, interactionEnabled = true } = options;

  if (!interactionEnabled) {
    return () => {};
  }

  let isTouching = false;

  const mapPoint = (event) => mapDevicePoint(event.clientX, event.clientY, canvas, nativeSize);

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
