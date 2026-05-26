/** scrcpy app/src/control_msg.h */
export const CONTROL_MSG_TYPE = {
  INJECT_KEYCODE: 0,
  INJECT_TEXT: 1,
  INJECT_TOUCH_EVENT: 2,
  INJECT_SCROLL_EVENT: 3,
  BACK_OR_SCREEN_ON: 4,
  EXPAND_NOTIFICATION_PANEL: 5,
  EXPAND_SETTINGS_PANEL: 6,
  COLLAPSE_PANELS: 7,
  GET_CLIPBOARD: 8,
  SET_CLIPBOARD: 9,
  SET_DISPLAY_POWER: 10,
  ROTATE_DEVICE: 11,
};

export const MOTION_ACTION = {
  DOWN: 0,
  UP: 1,
  MOVE: 2,
};

export const KEY_ACTION = {
  DOWN: 0,
  UP: 1,
};

export const POINTER_ID_MOUSE = 0xffff_ffff_ffff_ffffn;

const ANDROID_KEYCODE = {
  HOME: 3,
  BACK: 4,
  POWER: 26,
  VOLUME_UP: 24,
  VOLUME_DOWN: 25,
  APP_SWITCH: 187,
};

function writeU32BE(buffer, offset, value) {
  buffer.writeUInt32BE(value >>> 0, offset);
}

function writeU64BE(buffer, offset, value) {
  buffer.writeBigUInt64BE(BigInt(value), offset);
}

function writePosition(buffer, offset, point, screenSize) {
  writeU32BE(buffer, offset, Math.round(point.x));
  writeU32BE(buffer, offset + 4, Math.round(point.y));
  writeU16BE(buffer, offset + 8, screenSize.width);
  writeU16BE(buffer, offset + 10, screenSize.height);
}

function writeU16BE(buffer, offset, value) {
  buffer.writeUInt16BE(value & 0xffff, offset);
}

function floatToU16Fp(value) {
  const clamped = Math.min(1, Math.max(0, value));
  return Math.round(clamped * 0xffff);
}

function floatToI16Fp(value) {
  const clamped = Math.min(1, Math.max(-1, value / 16));
  return Math.max(-0x8000, Math.min(0x7fff, Math.round(clamped * 0x8000)));
}

function writeString(buffer, offset, text, maxLength) {
  const bytes = Buffer.from(text, "utf8");
  const length = Math.min(bytes.length, maxLength);
  writeU32BE(buffer, offset, length);
  bytes.copy(buffer, offset + 4, 0, length);
  return 4 + length;
}

export function serializeInjectTouch({
  action,
  pointerId = POINTER_ID_MOUSE,
  point,
  screenSize,
  pressure = 1,
  actionButton = 1,
  buttons = 1,
}) {
  const buffer = Buffer.alloc(32);
  buffer[0] = CONTROL_MSG_TYPE.INJECT_TOUCH_EVENT;
  buffer[1] = action;
  writeU64BE(buffer, 2, pointerId);
  writePosition(buffer, 10, point, screenSize);
  writeU16BE(buffer, 22, floatToU16Fp(pressure));
  writeU32BE(buffer, 24, actionButton);
  writeU32BE(buffer, 28, buttons);
  return buffer;
}

export function serializeInjectScroll({ point, screenSize, hscroll = 0, vscroll = 0, buttons = 0 }) {
  const buffer = Buffer.alloc(21);
  buffer[0] = CONTROL_MSG_TYPE.INJECT_SCROLL_EVENT;
  writePosition(buffer, 1, point, screenSize);
  writeU16BE(buffer, 13, floatToI16Fp(hscroll));
  writeU16BE(buffer, 15, floatToI16Fp(vscroll));
  writeU32BE(buffer, 17, buttons);
  return buffer;
}

export function serializeInjectKeycode({ action, keycode, repeat = 0, metastate = 0 }) {
  const buffer = Buffer.alloc(14);
  buffer[0] = CONTROL_MSG_TYPE.INJECT_KEYCODE;
  buffer[1] = action;
  writeU32BE(buffer, 2, keycode);
  writeU32BE(buffer, 6, repeat);
  writeU32BE(buffer, 10, metastate);
  return buffer;
}

export function serializeBackOrScreenOn(action = KEY_ACTION.DOWN) {
  return Buffer.from([CONTROL_MSG_TYPE.BACK_OR_SCREEN_ON, action]);
}

export function serializeSetDisplayPower(on) {
  return Buffer.from([CONTROL_MSG_TYPE.SET_DISPLAY_POWER, on ? 1 : 0]);
}

export function serializeRotateDevice() {
  return Buffer.from([CONTROL_MSG_TYPE.ROTATE_DEVICE]);
}

export function serializeCollapsePanels() {
  return Buffer.from([CONTROL_MSG_TYPE.COLLAPSE_PANELS]);
}

export function serializeGetClipboard(copyKey = 0) {
  return Buffer.from([CONTROL_MSG_TYPE.GET_CLIPBOARD, copyKey]);
}

export function serializeSetClipboard(text, paste = true, sequence = 0n) {
  const buffer = Buffer.alloc(10 + 4 + Buffer.byteLength(text, "utf8"));
  buffer[0] = CONTROL_MSG_TYPE.SET_CLIPBOARD;
  writeU64BE(buffer, 1, sequence);
  buffer[9] = paste ? 1 : 0;
  const stringBytes = writeString(buffer, 10, text, 256 * 1024);
  return buffer.subarray(0, 10 + stringBytes);
}

export function serializeInjectText(text) {
  const buffer = Buffer.alloc(1 + 4 + Buffer.byteLength(text, "utf8"));
  buffer[0] = CONTROL_MSG_TYPE.INJECT_TEXT;
  writeString(buffer, 1, text, 300);
  return buffer;
}

function serializeKeyTap(keycode) {
  return [
    serializeInjectKeycode({ action: KEY_ACTION.DOWN, keycode }),
    serializeInjectKeycode({ action: KEY_ACTION.UP, keycode }),
  ];
}

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
      return [serializeSetDisplayPower(false)];
    case "screen-on":
      return [serializeSetDisplayPower(true)];
    default:
      return [];
  }
}

export function serializeNavigationAction(actionId) {
  const buffers = serializeNavigationActions(actionId);
  return buffers[0] ?? null;
}
