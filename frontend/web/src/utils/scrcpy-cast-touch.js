/**
 * ws-scrcpy touch mapping + DOWN/MOVE/UP state machine (InteractionHandler).
 */

import { mapClientToVideoLocal, normalizeRotationDeg } from "./canvas-rotation.js";
import {
  BUTTON_PRIMARY,
  MOTION_ACTION,
  POINTER_ID_MOUSE,
  serializeInjectTouch,
} from "./ws-scrcpy-control.js";

export { POINTER_ID_MOUSE };

const EVENT_ACTION_MAP = {
  touchstart: MOTION_ACTION.DOWN,
  touchend: MOTION_ACTION.UP,
  touchmove: MOTION_ACTION.MOVE,
  touchcancel: MOTION_ACTION.UP,
  mousedown: MOTION_ACTION.DOWN,
  mousemove: MOTION_ACTION.MOVE,
  mouseup: MOTION_ACTION.UP,
};

export function isMouseLikePointer(pointerType) {
  return pointerType !== "touch";
}

function mapTypeToAction(type) {
  return EVENT_ACTION_MAP[type] ?? -1;
}

/**
 * Pointer capture can yield clientX/clientY = 0 on move; fall back to offsetX/Y.
 */
export function resolveEventClientXY(event, target) {
  const rect = target.getBoundingClientRect();
  let clientX = event.clientX;
  let clientY = event.clientY;

  const zeroClient = clientX === 0 && clientY === 0;
  const outside =
    !Number.isFinite(clientX) ||
    !Number.isFinite(clientY) ||
    clientX < rect.left - 1 ||
    clientX > rect.right + 1 ||
    clientY < rect.top - 1 ||
    clientY > rect.bottom + 1;

  if ((zeroClient || outside) && typeof event.offsetX === "number" && Number.isFinite(event.offsetX)) {
    const ox = event.offsetX;
    const oy = event.offsetY;

    if (ox !== 0 || oy !== 0) {
      clientX = rect.left + ox;
      clientY = rect.top + oy;
    }
  }

  return { clientX, clientY };
}

export function resolvePointerClientXY(event, target) {
  if (typeof event.getCoalescedEvents === "function") {
    const coalesced = event.getCoalescedEvents();

    for (let i = coalesced.length - 1; i >= 0; i -= 1) {
      const point = resolveEventClientXY(coalesced[i], target);

      if (point.clientX !== 0 || point.clientY !== 0) {
        return point;
      }
    }
  }

  return resolveEventClientXY(event, target);
}

export function createTouchPointerRegistry() {
  const pointerIdByTouchId = new Map();
  const touchIdByPointerId = new Map();

  return {
    resolve(type, identifier) {
      if (pointerIdByTouchId.has(identifier)) {
        const pointerId = pointerIdByTouchId.get(identifier);

        if (type === "touchend" || type === "touchcancel") {
          pointerIdByTouchId.delete(identifier);
          touchIdByPointerId.delete(pointerId);
        }

        return pointerId;
      }

      let pointerId = 0;

      while (touchIdByPointerId.has(pointerId)) {
        pointerId += 1;
      }

      pointerIdByTouchId.set(identifier, pointerId);
      touchIdByPointerId.set(pointerId, identifier);
      return pointerId;
    },
    clear() {
      pointerIdByTouchId.clear();
      touchIdByPointerId.clear();
    },
  };
}

function resolveTouchAction(event, pointerType, primaryDown) {
  const mapped = mapTypeToAction(event.type);

  if (mapped < 0) {
    return -1;
  }

  if (pointerType === "touch") {
    return mapped;
  }

  if (event.type === "mousemove") {
    if (primaryDown || ((event.buttons ?? 0) & BUTTON_PRIMARY) !== 0) {
      return MOTION_ACTION.MOVE;
    }

    return MOTION_ACTION.HOVER_MOVE;
  }

  return mapped;
}

/**
 * @param {object} event
 * @param {HTMLElement} target
 * @param {{ width: number, height: number }} screenSize
 * @param {HTMLElement | null} rotator
 * @param {{ primaryDown?: boolean }} [options]
 */
export function buildTouchOnClient(event, target, screenSize, rotator, options = {}) {
  const { primaryDown = false } = options;
  const pointerType =
    event.pointerType === "touch" || event.type?.startsWith("touch") ? "touch" : "mouse";
  const action = resolveTouchAction(event, pointerType, primaryDown);

  if (action < 0 || !screenSize.width || !screenSize.height) {
    return null;
  }

  const useCoalesced =
    event.type === "mousemove" || event.type === "mouseup" || event.type === "touchmove";
  const { clientX, clientY } = useCoalesced
    ? resolvePointerClientXY(event, target)
    : resolveEventClientXY(event, target);
  const local = mapClientToVideoLocal(clientX, clientY, target, screenSize);

  const deg = rotator ? normalizeRotationDeg(Number(rotator.dataset?.rotation || 0)) : 0;
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

  const x = Math.round(Math.min(1, Math.max(0, nx)) * screenSize.width);
  const y = Math.round(Math.min(1, Math.max(0, ny)) * screenSize.height);

  const buttons =
    action === MOTION_ACTION.HOVER_MOVE
      ? 0
      : action === MOTION_ACTION.UP
        ? 0
        : BUTTON_PRIMARY;

  return {
    touch: {
      action,
      pointerId: pointerType === "touch" ? 0n : POINTER_ID_MOUSE,
      point: { x, y },
      screenSize,
      pressure: action === MOTION_ACTION.UP ? 0 : 1,
      buttons,
      invalid: false,
    },
  };
}

export function touchToBuffer(frame) {
  return serializeInjectTouch({
    action: frame.action,
    pointerId: typeof frame.pointerId === "bigint" ? frame.pointerId : BigInt(frame.pointerId),
    point: frame.point,
    screenSize: frame.screenSize,
    pressure: frame.pressure,
    buttons: frame.buttons,
  });
}

export function validateTouchSequence(storage, frame) {
  if (frame.action === MOTION_ACTION.HOVER_MOVE) {
    return [touchToBuffer(frame)];
  }

  const buffers = [];
  const pointerKey = frame.pointerId;
  const previous = storage.get(pointerKey);

  if (frame.action === MOTION_ACTION.UP) {
    if (previous) {
      storage.delete(pointerKey);
      buffers.push(touchToBuffer(frame));
    }

    return buffers;
  }

  if (frame.action === MOTION_ACTION.DOWN) {
    if (!previous) {
      storage.set(pointerKey, frame);
      buffers.push(touchToBuffer(frame));
    }

    return buffers;
  }

  if (frame.action === MOTION_ACTION.MOVE) {
    if (!previous) {
      const downFrame = { ...frame, action: MOTION_ACTION.DOWN, pressure: 1, buttons: BUTTON_PRIMARY };
      storage.set(pointerKey, downFrame);
      buffers.push(touchToBuffer(downFrame));
    }

    storage.set(pointerKey, frame);
    buffers.push(touchToBuffer(frame));
  }

  return buffers;
}

export function emulatedUpFrame(frame) {
  return {
    ...frame,
    action: MOTION_ACTION.UP,
    pressure: 0,
    buttons: 0,
  };
}
