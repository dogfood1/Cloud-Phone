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
};

const MOTION_ACTION = {
  DOWN: 0,
  UP: 1,
  MOVE: 2,
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

export function serializeInjectTouch({ action, point, screenSize, pointerId = 0n, pressure = 1 }) {
  const buffer = new ArrayBuffer(28);
  const view = new DataView(buffer);
  view.setUint8(0, CONTROL_MSG_TYPE.INJECT_TOUCH_EVENT);
  view.setUint8(1, action);
  writeU64BE(view, 2, pointerId);
  writeU32BE(view, 10, Math.round(point.x));
  writeU32BE(view, 14, Math.round(point.y));
  writeU16BE(view, 18, screenSize.width);
  writeU16BE(view, 20, screenSize.height);
  view.setUint16(22, Math.round(Math.min(1, Math.max(0, pressure)) * 0xffff), false);
  view.setUint32(24, 1, false); // buttons
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

export function serializeSetScreenPowerMode(on) {
  return new Uint8Array([CONTROL_MSG_TYPE.SET_SCREEN_POWER_MODE, on ? 1 : 0]);
}

export function serializeRotateDevice() {
  return new Uint8Array([CONTROL_MSG_TYPE.ROTATE_DEVICE]);
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

function serializeKeyTap(keycode) {
  return [
    serializeInjectKeycode({ action: KEY_ACTION.DOWN, keycode }),
    serializeInjectKeycode({ action: KEY_ACTION.UP, keycode }),
  ];
}

/** scrcpy toolbar: one logical press = DOWN then UP (or paired control msgs). */
export function serializeNavigationActions(actionId) {
  switch (actionId) {
    case "home":
      return serializeKeyTap(ANDROID_KEYCODE.HOME);
    case "recents":
      return serializeKeyTap(ANDROID_KEYCODE.APP_SWITCH);
    case "back":
      return [
        serializeBackOrScreenOn(KEY_ACTION.DOWN),
        serializeBackOrScreenOn(KEY_ACTION.UP),
      ];
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

