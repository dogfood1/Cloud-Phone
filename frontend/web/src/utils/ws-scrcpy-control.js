const CONTROL_MSG_TYPE = {
  INJECT_KEYCODE: 0,
  INJECT_TEXT: 1,
  INJECT_TOUCH_EVENT: 2,
  INJECT_SCROLL_EVENT: 3,
  BACK_OR_SCREEN_ON: 4,
  SET_CLIPBOARD: 9,
  SET_SCREEN_POWER_MODE: 10,
  ROTATE_DEVICE: 11,
  START_APP: 16,
  RESET_VIDEO: 17,
};

const MOTION_ACTION = {
  DOWN: 0,
  UP: 1,
  MOVE: 2,
  /** scrcpy mouse_sdk — pointer over screen without press */
  HOVER_MOVE: 7,
};

const KEY_ACTION = {
  DOWN: 0,
  UP: 1,
};

const ANDROID_KEYCODE = {
  HOME: 3,
  BACK: 4,
  POWER: 26,
  VOLUME_UP: 24,
  VOLUME_DOWN: 25,
  APP_SWITCH: 187,
  WAKEUP: 224,
};

function writeU32BE(view, offset, value) {
  view.setUint32(offset, value >>> 0, false);
}

function writeU16BE(view, offset, value) {
  view.setUint16(offset, value & 0xffff, false);
}

function writeU64BE(view, offset, value) {
  const big = BigInt(value);
  view.setBigUint64(offset, big, false);
}

function floatToI16Fp(value) {
  const clamped = Math.min(1, Math.max(-1, value / 16));
  return Math.max(-0x8000, Math.min(0x7fff, Math.round(clamped * 0x8000)));
}

function encodeUtf8(text) {
  return new TextEncoder().encode(String(text ?? ""));
}

export { MOTION_ACTION };

/** scrcpy control_msg.h SC_POINTER_ID_MOUSE */
export const POINTER_ID_MOUSE = -1n;

/** scrcpy control_msg.h — mouse / primary button */
export const BUTTON_PRIMARY = 1;

/** scrcpy 4.0 inject_touch_event is 32 bytes (includes actionButton). */
export function touchPhaseFields(action, pressure) {
  switch (action) {
    case MOTION_ACTION.DOWN:
      return { actionButton: BUTTON_PRIMARY, buttons: BUTTON_PRIMARY, pressure: pressure ?? 1 };
    case MOTION_ACTION.MOVE:
      return { actionButton: 0, buttons: BUTTON_PRIMARY, pressure: pressure ?? 1 };
    case MOTION_ACTION.UP:
      return { actionButton: BUTTON_PRIMARY, buttons: 0, pressure: 0 };
    case MOTION_ACTION.HOVER_MOVE:
      return { actionButton: 0, buttons: 0, pressure: 1 };
    default:
      return { actionButton: 0, buttons: 0, pressure: pressure ?? 0 };
  }
}

/**
 * scrcpy 4.0 INJECT_TOUCH_EVENT (32 bytes).
 * ws-scrcpy v1.19 used 28 bytes without actionButton; incompatible with this server.
 */
export function serializeInjectTouch({
  action,
  point,
  screenSize,
  pointerId = 0n,
  pressure,
  actionButton,
  buttons,
}) {
  const phase = touchPhaseFields(action, pressure);
  const buffer = new ArrayBuffer(32);
  const view = new DataView(buffer);
  view.setUint8(0, CONTROL_MSG_TYPE.INJECT_TOUCH_EVENT);
  view.setUint8(1, action);
  writeU64BE(view, 2, pointerId);
  writeU32BE(view, 10, Math.round(point.x));
  writeU32BE(view, 14, Math.round(point.y));
  writeU16BE(view, 18, screenSize.width);
  writeU16BE(view, 20, screenSize.height);
  const pressureValue = phase.pressure ?? 0;
  view.setUint16(22, Math.round(Math.min(1, Math.max(0, pressureValue)) * 0xffff), false);
  writeU32BE(view, 24, actionButton ?? phase.actionButton);
  writeU32BE(view, 28, buttons ?? phase.buttons);
  return new Uint8Array(buffer);
}

export function serializeInjectScroll({ point, screenSize, hscroll = 0, vscroll = 0 }) {
  const buffer = new ArrayBuffer(21);
  const view = new DataView(buffer);
  view.setUint8(0, CONTROL_MSG_TYPE.INJECT_SCROLL_EVENT);
  writeU32BE(view, 1, Math.round(point.x));
  writeU32BE(view, 5, Math.round(point.y));
  writeU16BE(view, 9, screenSize.width);
  writeU16BE(view, 11, screenSize.height);
  view.setInt16(13, floatToI16Fp(hscroll), false);
  view.setInt16(15, floatToI16Fp(vscroll), false);
  writeU32BE(view, 17, 0);
  return new Uint8Array(buffer);
}

export function serializeInjectKeycode({ action, keycode, repeat = 0, metastate = 0 }) {
  const buffer = new ArrayBuffer(14);
  const view = new DataView(buffer);
  view.setUint8(0, CONTROL_MSG_TYPE.INJECT_KEYCODE);
  view.setUint8(1, action);
  writeU32BE(view, 2, keycode);
  writeU32BE(view, 6, repeat);
  writeU32BE(view, 10, metastate);
  return new Uint8Array(buffer);
}

export function serializeBackOrScreenOn(action = KEY_ACTION.DOWN) {
  return new Uint8Array([CONTROL_MSG_TYPE.BACK_OR_SCREEN_ON, action]);
}

/** scrcpy type 10: boolean `on` in 4.x; legacy ws-scrcpy uses POWER_MODE_OFF=0 / POWER_MODE_NORMAL=2. */
const POWER_MODE_OFF = 0;
const POWER_MODE_NORMAL = 2;

export function serializeSetScreenPowerMode(on) {
  const mode = on ? POWER_MODE_NORMAL : POWER_MODE_OFF;
  return new Uint8Array([CONTROL_MSG_TYPE.SET_SCREEN_POWER_MODE, mode]);
}

export function serializeRotateDevice() {
  return new Uint8Array([CONTROL_MSG_TYPE.ROTATE_DEVICE]);
}

export function serializeResetVideo() {
  return new Uint8Array([CONTROL_MSG_TYPE.RESET_VIDEO]);
}

/** scrcpy control message: 1-byte tiny length + UTF-8 app name (package or ?name). */
export function serializeStartApp(name) {
  const bytes = encodeUtf8(name);
  const length = Math.min(bytes.length, 255);

  if (length === 0) {
    return null;
  }

  const buffer = new ArrayBuffer(2 + length);
  const view = new DataView(buffer);
  view.setUint8(0, CONTROL_MSG_TYPE.START_APP);
  view.setUint8(1, length);
  new Uint8Array(buffer, 2).set(bytes.subarray(0, length));
  return new Uint8Array(buffer);
}

export function serializeSetClipboard(text, paste = true, sequence = 0n) {
  const bytes = encodeUtf8(text);
  const buffer = new ArrayBuffer(10 + 4 + bytes.length);
  const view = new DataView(buffer);
  view.setUint8(0, CONTROL_MSG_TYPE.SET_CLIPBOARD);
  writeU64BE(view, 1, sequence);
  view.setUint8(9, paste ? 1 : 0);
  writeU32BE(view, 10, bytes.length);
  new Uint8Array(buffer, 14).set(bytes);
  return new Uint8Array(buffer);
}

export { KEY_ACTION };

/** Toolbar hold: one phase (DOWN or UP) per browser pointer event. */
export function serializeNavigationPress(actionId, keyAction) {
  switch (actionId) {
    case "home":
      return serializeInjectKeycode({ action: keyAction, keycode: ANDROID_KEYCODE.HOME });
    case "recents":
      return serializeInjectKeycode({ action: keyAction, keycode: ANDROID_KEYCODE.APP_SWITCH });
    case "back":
      return serializeInjectKeycode({ action: keyAction, keycode: ANDROID_KEYCODE.BACK });
    case "power":
      return serializeInjectKeycode({ action: keyAction, keycode: ANDROID_KEYCODE.POWER });
    case "volume-up":
      return serializeInjectKeycode({ action: keyAction, keycode: ANDROID_KEYCODE.VOLUME_UP });
    case "volume-down":
      return serializeInjectKeycode({ action: keyAction, keycode: ANDROID_KEYCODE.VOLUME_DOWN });
    default:
      return null;
  }
}

function serializeKeyTap(keycode) {
  return [
    serializeInjectKeycode({ action: KEY_ACTION.DOWN, keycode }),
    serializeInjectKeycode({ action: KEY_ACTION.UP, keycode }),
  ];
}

/** After display power on: nudge System UI + refresh capture (avoids black mirror). */
export function serializeDisplayWakeActions() {
  return [
    serializeSetScreenPowerMode(true),
    ...serializeKeyTap(ANDROID_KEYCODE.WAKEUP),
    ...serializeKeyTap(ANDROID_KEYCODE.HOME),
    serializeResetVideo(),
  ];
}

/** One-shot navigation (rotate, display power, wake). */
export function serializeNavigationActions(actionId) {
  switch (actionId) {
    case "home":
      return serializeKeyTap(ANDROID_KEYCODE.HOME);
    case "recents":
      return serializeKeyTap(ANDROID_KEYCODE.APP_SWITCH);
    case "back":
      return serializeKeyTap(ANDROID_KEYCODE.BACK);
    case "power":
      return serializeKeyTap(ANDROID_KEYCODE.POWER);
    case "volume-up":
      return serializeKeyTap(ANDROID_KEYCODE.VOLUME_UP);
    case "volume-down":
      return serializeKeyTap(ANDROID_KEYCODE.VOLUME_DOWN);
    case "rotate":
      return [serializeRotateDevice()];
    case "screen-off":
      return [serializeSetScreenPowerMode(false)];
    case "screen-on":
      return [serializeSetScreenPowerMode(true)];
    case "wake-screen":
      return [serializeInjectKeycode({ action: KEY_ACTION.DOWN, keycode: ANDROID_KEYCODE.POWER })];
    case "wake-screen-up":
      return [serializeInjectKeycode({ action: KEY_ACTION.UP, keycode: ANDROID_KEYCODE.POWER })];
    default:
      return [];
  }
}

/** @deprecated Prefer serializeNavigationActions for toolbar keys. */
export function serializeNavigationAction(actionId) {
  const buffers = serializeNavigationActions(actionId);
  return buffers[0] ?? null;
}

