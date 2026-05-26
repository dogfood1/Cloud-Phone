/**
 * ws-scrcpy FeaturedInteractionHandler-style canvas control (pointer + capture).
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
  /** @type {number | null} */
  let activePointerId = null;
  let mousePressed = false;
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
      sendControl(touchToBuffer(frame));
      return;
    }

    if (frame.point.x !== 0 || frame.point.y !== 0) {
      lastGoodPoint = { ...frame.point };
    }

    sendFrames(validateTouchSequence(mouseStorage, frame));
  };

  function buildPointerFrame(event, mouseType) {
    const { clientX, clientY } =
      mouseType === "mousemove"
        ? resolvePointerClientXY(event, canvas)
        : resolveEventClientXY(event, canvas);
    const built = buildTouchOnClient(
      {
        ...event,
        clientX,
        clientY,
        type: mouseType,
        pointerType: event.pointerType,
        target: canvas,
        buttons: mouseType === "mousedown" ? BUTTON_PRIMARY : event.buttons ?? 0,
      },
      canvas,
      getScreenSize(),
      getRotator(),
    );

    if (!built || built.touch.invalid) {
      return null;
    }

    if (built.touch.point.x === 0 && built.touch.point.y === 0) {
      if (lastGoodPoint && mouseType !== "mouseup" && built.touch.action !== MOTION_ACTION.HOVER_MOVE) {
        return {
          ...built,
          touch: { ...built.touch, point: { ...lastGoodPoint } },
        };
      }

      if (built.touch.action === MOTION_ACTION.HOVER_MOVE) {
        return null;
      }

      return null;
    }

    if (built.touch.action === MOTION_ACTION.HOVER_MOVE && pressed) {
      return null;
    }

    return built;
  }

  const endActivePointer = (event) => {
    if (activePointerId === null) {
      return;
    }

    const pointerId = activePointerId;
    activePointerId = null;

    try {
      if (canvas.hasPointerCapture?.(pointerId)) {
        canvas.releasePointerCapture(pointerId);
      }
    } catch {
      // ignore
    }

    if (!hasScreenInfo()) {
      flushMouseStorage();
      return;
    }

    const built = buildPointerFrame(
      { ...event, type: "mouseup", buttons: 0, target: canvas },
      "mouseup",
    );

    if (!built) {
      flushMouseStorage();
      lastGoodPoint = null;
      return;
    }

    mousePressed = false;
    sendTouchFrame({
      ...built.touch,
      pointerId: built.touch.pointerId,
      pressure: 0,
      buttons: 0,
    });
    lastGoodPoint = null;
  };

  function flushMouseStorage() {
    for (const frame of mouseStorage.values()) {
      sendControl(touchToBuffer(emulatedUpFrame(frame)));
    }

    mouseStorage.clear();
  }

  const onWheel = (event) => {
    if (!hasScreenInfo() || event.target !== canvas) {
      return;
    }

    const built = buildTouchOnClient(event, canvas, getScreenSize(), getRotator());

    if (!built || built.touch.invalid) {
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

    if (event.pointerType === "mouse" && event.button !== 0 && event.type === "pointerdown") {
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
      mousePressed = true;

      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // ignore
      }

      const built = buildPointerFrame(event, mouseType);

      if (!built) {
        return;
      }

      if (event.cancelable) {
        event.preventDefault();
      }

      event.stopPropagation();

      sendTouchFrame({
        ...built.touch,
        pointerId: event.pointerType === "mouse" ? POINTER_ID_MOUSE : built.touch.pointerId,
        pressure: 1,
        buttons: BUTTON_PRIMARY,
      });
      return;
    }

    if (activePointerId !== null && event.pointerId !== activePointerId) {
      return;
    }

    if (event.type === "pointermove") {
      const pressed = (event.buttons & BUTTON_PRIMARY) !== 0;

      if (event.pointerType === "mouse" && !pressed && !mousePressed) {
        const built = buildPointerFrame(event, mouseType);

        if (!built) {
          return;
        }

        if (event.cancelable) {
          event.preventDefault();
        }

        sendTouchFrame(built.touch);
        return;
      }

      if (!pressed && activePointerId === null) {
        return;
      }

      const built = buildPointerFrame(event, mouseType);

      if (!built) {
        return;
      }

      if (event.cancelable) {
        event.preventDefault();
      }

      sendTouchFrame({
        ...built.touch,
        pointerId: event.pointerType === "mouse" ? POINTER_ID_MOUSE : built.touch.pointerId,
        pressure: built.touch.action === MOTION_ACTION.UP ? 0 : 1,
        buttons: pressed ? BUTTON_PRIMARY : 0,
      });
      return;
    }

    if (event.type === "pointerup" || event.type === "pointercancel") {
      mousePressed = false;

      if (event.cancelable) {
        event.preventDefault();
      }

      event.stopPropagation();
      endActivePointer(event);
    }
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

      if (frame.invalid) {
        const previous = touchStorage.get(pointerId);

        if (previous) {
          buffers.push(...validateTouchSequence(touchStorage, emulatedUpFrame(previous)));
        }

        continue;
      }

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
    if (activePointerId === event.pointerId) {
      endActivePointer(event);
    }
  };

  canvas.addEventListener("wheel", onWheel, passiveOpts);
  canvas.addEventListener("pointerdown", onPointer, passiveOpts);
  canvas.addEventListener("pointermove", onPointer, passiveOpts);
  canvas.addEventListener("pointerup", onPointer, passiveOpts);
  canvas.addEventListener("pointercancel", onPointer, passiveOpts);
  canvas.addEventListener("lostpointercapture", onLostCapture);
  ["touchstart", "touchend", "touchmove", "touchcancel"].forEach((name) => {
    canvas.addEventListener(name, onTouch, passiveOpts);
  });

  return () => {
    if (activePointerId !== null) {
      activePointerId = null;
      flushMouseStorage();
    }

    for (const frame of touchStorage.values()) {
      sendControl(touchToBuffer(emulatedUpFrame(frame)));
    }

    touchStorage.clear();
    touchPointers.clear();
    canvas.removeEventListener("wheel", onWheel);
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
