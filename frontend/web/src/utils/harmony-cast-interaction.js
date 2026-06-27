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
    canvas.width === nativeSize.width &&
    canvas.height === nativeSize.height
  ) {
    return canvasPoint;
  }

  return {
    x: Math.round((canvasPoint.x * nativeSize.width) / canvas.width),
    y: Math.round((canvasPoint.y * nativeSize.height) / canvas.height),
  };
}

/**
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

  let pointerDown = false;
  let startPoint = null;

  const onPointerDown = (event) => {
    event.preventDefault();
    pointerDown = true;
    startPoint = mapDevicePoint(event.clientX, event.clientY, canvas, nativeSize);
    canvas.setPointerCapture(event.pointerId);
  };

  const onPointerUp = (event) => {
    if (!pointerDown || !startPoint) {
      return;
    }

    event.preventDefault();
    const endPoint = mapDevicePoint(event.clientX, event.clientY, canvas, nativeSize);
    const dx = Math.abs(endPoint.x - startPoint.x);
    const dy = Math.abs(endPoint.y - startPoint.y);

    if (dx < 8 && dy < 8) {
      sendMessage({ type: "click", x: endPoint.x, y: endPoint.y });
    } else {
      sendMessage({
        type: "swipe",
        x1: startPoint.x,
        y1: startPoint.y,
        x2: endPoint.x,
        y2: endPoint.y,
        speed: 2000,
      });
    }

    pointerDown = false;
    startPoint = null;

    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  };

  canvas.addEventListener("pointerdown", onPointerDown, passiveOpts);
  canvas.addEventListener("pointerup", onPointerUp, passiveOpts);
  canvas.addEventListener("pointercancel", onPointerUp, passiveOpts);

  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown, passiveOpts);
    canvas.removeEventListener("pointerup", onPointerUp, passiveOpts);
    canvas.removeEventListener("pointercancel", onPointerUp, passiveOpts);
  };
}
