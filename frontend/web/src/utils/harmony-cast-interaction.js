const passiveOpts = { passive: false };

function mapPoint(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: Math.round((clientX - rect.left) * scaleX),
    y: Math.round((clientY - rect.top) * scaleY),
  };
}

/**
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   sendMessage: (payload: object) => void,
 *   interactionEnabled?: boolean,
 * }} options
 */
export function attachHarmonyCastInteraction(options) {
  const { canvas, sendMessage, interactionEnabled = true } = options;

  if (!interactionEnabled) {
    return () => {};
  }

  let pointerDown = false;
  let startPoint = null;

  const onPointerDown = (event) => {
    event.preventDefault();
    pointerDown = true;
    startPoint = mapPoint(canvas, event.clientX, event.clientY);
    canvas.setPointerCapture(event.pointerId);
  };

  const onPointerUp = (event) => {
    if (!pointerDown || !startPoint) {
      return;
    }

    event.preventDefault();
    const endPoint = mapPoint(canvas, event.clientX, event.clientY);
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
