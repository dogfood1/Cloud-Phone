/**
 * scrcpy SDK mouse + touch on cast canvas (hover / press / drag / release).
 */

import {
  BUTTON_PRIMARY,
  MOTION_ACTION,
  POINTER_ID_MOUSE,
  serializeInjectScroll,
} from "./ws-scrcpy-control.js";
import {
  buildTouchOnClient,
  createTouchPointerRegistry,
  emulatedUpFrame,
  isMouseLikePointer,
  resolveEventClientXY,
  resolvePointerClientXY,
  touchToBuffer,
  validateTouchSequence,
} from "./scrcpy-cast-touch.js";

const SCROLL_THROTTLE_MS = 30;
const HOVER_THROTTLE_MS = 16;
const passiveOpts = { passive: false };

const POINTER_TO_MOUSE = {
  pointerdown: "mousedown",
  pointerup: "mouseup",
  pointercancel: "mouseup",
  pointermove: "mousemove",
};

/**
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   getScreenSize: () => { width: number, height: number },
 *   getRotator: () => HTMLElement | null,
 *   hasScreenInfo: () => boolean,
 *   sendControl: (buffer: Uint8Array) => void,
 * }} options
 */
export function attachCastInteraction(options) {
  const { canvas, getScreenSize, getRotator, hasScreenInfo, sendControl } = options;
  const mouseStorage = new Map();
  const touchStorage = new Map();
  const touchPointers = createTouchPointerRegistry();
  let lastScroll = null;
  let lastHoverSent = 0;
  /** Primary button held (scrcpy mouse_sdk buttons_state). */
  let primaryDown = false;
  /** @type {number | null} */
  let activePointerId = null;
  /** @type {{ x: number, y: number } | null} */
  let lastGoodPoint = null;

  const sendFrames = (buffers) => {
    for (const buffer of buffers) {
      sendControl(buffer);
    }
  };

  const sendTouchFrame = (frame) => {
    if (frame.action === MOTION_ACTION.HOVER_MOVE) {
      const now = Date.now();

      if (now - lastHoverSent < HOVER_THROTTLE_MS) {
        return;
      }

      lastHoverSent = now;

      if (frame.point.x !== 0 || frame.point.y !== 0) {
        lastGoodPoint = { ...frame.point };
      }

      sendControl(touchToBuffer(frame));
      return;
    }

    if (frame.point.x !== 0 || frame.point.y !== 0) {
      lastGoodPoint = { ...frame.point };
    }

    sendFrames(validateTouchSequence(mouseStorage, frame));
  };

  function makeSyntheticEvent(event, mouseType, buttons) {
    const useCoalesced = mouseType === "mousemove" || mouseType === "mouseup";
    const { clientX, clientY } = useCoalesced
      ? resolvePointerClientXY(event, canvas)
      : resolveEventClientXY(event, canvas);

    return {
      clientX,
      clientY,
      type: mouseType,
      pointerType: isMouseLikePointer(event.pointerType) ? "mouse" : "touch",
      buttons: buttons ?? event.buttons ?? 0,
      target: canvas,
    };
  }

  function buildFrame(event, mouseType, buttons) {
    const synthetic = makeSyntheticEvent(event, mouseType, buttons);
    const built = buildTouchOnClient(synthetic, canvas, getScreenSize(), getRotator(), {
      primaryDown,
    });

    if (!built) {
      return null;
    }

    if (built.touch.point.x === 0 && built.touch.point.y === 0) {
      if (!lastGoodPoint) {
        return null;
      }

      return {
        ...built,
        touch: { ...built.touch, point: { ...lastGoodPoint } },
      };
    }

    return built;
  }

  function sendMouseDown(event, mouseType) {
    const built = buildFrame(event, mouseType, BUTTON_PRIMARY);

    if (!built) {
      return false;
    }

    primaryDown = true;
    sendTouchFrame({
      ...built.touch,
      pointerId: POINTER_ID_MOUSE,
      action: MOTION_ACTION.DOWN,
      pressure: 1,
      buttons: BUTTON_PRIMARY,
    });
    return true;
  }

  function sendMouseMove(event, mouseType) {
    const built = buildFrame(
      event,
      mouseType,
      primaryDown ? BUTTON_PRIMARY : 0,
    );

    if (!built) {
      return;
    }

    sendTouchFrame({
      ...built.touch,
      pointerId: POINTER_ID_MOUSE,
      buttons: primaryDown ? BUTTON_PRIMARY : 0,
      pressure: 1,
    });
  }

  function sendMouseUp(event) {
    const built = buildFrame(event, "mouseup", 0);

    const upFrame = built
      ? {
          ...built.touch,
          pointerId: POINTER_ID_MOUSE,
          action: MOTION_ACTION.UP,
          pressure: 0,
          buttons: 0,
        }
      : lastGoodPoint
        ? {
            ...(mouseStorage.get(POINTER_ID_MOUSE) ?? {
              screenSize: getScreenSize(),
              pointerId: POINTER_ID_MOUSE,
            }),
            action: MOTION_ACTION.UP,
            point: { ...lastGoodPoint },
            pressure: 0,
            buttons: 0,
          }
        : null;

    primaryDown = false;

    if (upFrame) {
      sendTouchFrame(upFrame);
    } else {
      flushMouseStorage();
    }

    lastGoodPoint = null;
  }

  function flushMouseStorage() {
    for (const frame of mouseStorage.values()) {
      sendControl(touchToBuffer(emulatedUpFrame(frame)));
    }

    mouseStorage.clear();
  }

  function releasePointerCaptureSafe(pointerId) {
    try {
      if (canvas.hasPointerCapture?.(pointerId)) {
        canvas.releasePointerCapture(pointerId);
      }
    } catch {
      // ignore
    }
  }

  const onWheel = (event) => {
    if (!hasScreenInfo() || event.target !== canvas) {
      return;
    }

    const built = buildTouchOnClient(
      makeSyntheticEvent(event, "mousemove", 0),
      canvas,
      getScreenSize(),
      getRotator(),
      { primaryDown: false },
    );

    if (!built) {
      return;
    }

    const hScroll = event.deltaX > 0 ? -1 : event.deltaX < 0 ? 1 : 0;
    const vScroll = event.deltaY > 0 ? -1 : event.deltaY < 0 ? 1 : 0;
    const now = Date.now();

    if (
      lastScroll &&
      now - lastScroll.time < SCROLL_THROTTLE_MS &&
      lastScroll.hScroll === hScroll &&
      lastScroll.vScroll === vScroll
    ) {
      return;
    }

    lastScroll = { time: now, hScroll, vScroll };
    event.preventDefault();
    event.stopPropagation();

    sendControl(
      serializeInjectScroll({
        point: built.touch.point,
        screenSize: built.touch.screenSize,
        hscroll: hScroll,
        vscroll: vScroll,
      }),
    );
  };

  const onPointer = (event) => {
    if (!hasScreenInfo()) {
      return;
    }

    if (!isMouseLikePointer(event.pointerType)) {
      return;
    }

    if (event.button !== 0 && event.type === "pointerdown") {
      return;
    }

    const mouseType = POINTER_TO_MOUSE[event.type];

    if (!mouseType) {
      return;
    }

    if (event.type === "pointerdown") {
      if (event.target !== canvas) {
        return;
      }

      activePointerId = event.pointerId;

      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // ignore
      }

      if (!sendMouseDown(event, mouseType)) {
        activePointerId = null;
        primaryDown = false;
        releasePointerCaptureSafe(event.pointerId);
        return;
      }

      if (event.cancelable) {
        event.preventDefault();
      }

      event.stopPropagation();
      return;
    }

    if (activePointerId !== null && event.pointerId !== activePointerId) {
      return;
    }

    if (event.type === "pointermove") {
      if (event.cancelable) {
        event.preventDefault();
      }

      sendMouseMove(event, mouseType);
      return;
    }

    if (event.type === "pointerup" || event.type === "pointercancel") {
      if (event.cancelable) {
        event.preventDefault();
      }

      event.stopPropagation();

      const pointerId = activePointerId;
      activePointerId = null;
      sendMouseUp(event);
      releasePointerCaptureSafe(pointerId);
    }
  };

  const onPointerEnter = (event) => {
    if (!hasScreenInfo() || !isMouseLikePointer(event.pointerType) || primaryDown) {
      return;
    }

    sendMouseMove(event, "mousemove");
  };

  const onTouch = (event) => {
    if (!hasScreenInfo()) {
      return;
    }

    const touches = event.changedTouches;

    if (!touches?.length) {
      return;
    }

    const buffers = [];

    for (let i = 0; i < touches.length; i += 1) {
      const touch = touches[i];

      if (touch.target !== canvas) {
        continue;
      }

      const built = buildTouchOnClient(
        {
          clientX: touch.clientX,
          clientY: touch.clientY,
          type: event.type,
          pointerType: "touch",
          buttons: BUTTON_PRIMARY,
          target: canvas,
        },
        canvas,
        getScreenSize(),
        getRotator(),
        { primaryDown: event.type === "touchmove" || event.type === "touchstart" },
      );

      if (!built) {
        continue;
      }

      const pointerId = touchPointers.resolve(event.type, touch.identifier);
      let pressure = 1;

      if (built.touch.action === MOTION_ACTION.UP) {
        pressure = 0;
      } else if (typeof touch.force === "number") {
        pressure = touch.force;
      }

      const frame = {
        ...built.touch,
        pointerId,
        pressure,
        buttons: built.touch.action === MOTION_ACTION.UP ? 0 : BUTTON_PRIMARY,
      };

      buffers.push(...validateTouchSequence(touchStorage, frame));
    }

    if (!buffers.length) {
      return;
    }

    if (event.cancelable) {
      event.preventDefault();
    }

    event.stopPropagation();

    for (const buffer of buffers) {
      sendControl(buffer);
    }
  };

  const onLostCapture = (event) => {
    if (primaryDown && event.pointerId === activePointerId) {
      activePointerId = null;
      sendMouseUp(event);
    }
  };

  canvas.addEventListener("wheel", onWheel, passiveOpts);
  canvas.addEventListener("pointerenter", onPointerEnter, passiveOpts);
  canvas.addEventListener("pointerdown", onPointer, passiveOpts);
  canvas.addEventListener("pointermove", onPointer, passiveOpts);
  canvas.addEventListener("pointerup", onPointer, passiveOpts);
  canvas.addEventListener("pointercancel", onPointer, passiveOpts);
  canvas.addEventListener("lostpointercapture", onLostCapture);
  ["touchstart", "touchend", "touchmove", "touchcancel"].forEach((name) => {
    canvas.addEventListener(name, onTouch, passiveOpts);
  });

  return () => {
    if (primaryDown) {
      flushMouseStorage();
    }

    primaryDown = false;
    activePointerId = null;
    lastGoodPoint = null;

    for (const frame of touchStorage.values()) {
      sendControl(touchToBuffer(emulatedUpFrame(frame)));
    }

    touchStorage.clear();
    touchPointers.clear();
    canvas.removeEventListener("wheel", onWheel);
    canvas.removeEventListener("pointerenter", onPointerEnter);
    canvas.removeEventListener("pointerdown", onPointer);
    canvas.removeEventListener("pointermove", onPointer);
    canvas.removeEventListener("pointerup", onPointer);
    canvas.removeEventListener("pointercancel", onPointer);
    canvas.removeEventListener("lostpointercapture", onLostCapture);
    ["touchstart", "touchend", "touchmove", "touchcancel"].forEach((name) => {
      canvas.removeEventListener(name, onTouch);
    });
  };
}
