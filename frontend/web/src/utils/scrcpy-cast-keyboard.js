import { KEY_ACTION, serializeInjectKeycode } from "./ws-scrcpy-control.js";

const META_STATE = {
  SHIFT_ON: 0x00000001,
  ALT_ON: 0x00000002,
  CTRL_ON: 0x00001000,
  META_ON: 0x00010000,
  CAPS_LOCK_ON: 0x00100000,
  NUM_LOCK_ON: 0x00200000,
};

const KEY_BY_CODE = {
  Escape: 111,
  Tab: 61,
  CapsLock: 115,
  ShiftLeft: 59,
  ShiftRight: 60,
  ControlLeft: 113,
  ControlRight: 114,
  AltLeft: 57,
  AltRight: 58,
  MetaLeft: 117,
  MetaRight: 118,
  ContextMenu: 82,
  Enter: 66,
  NumpadEnter: 66,
  Space: 62,
  Backspace: 67,
  Delete: 112,
  Insert: 124,
  Home: 122,
  End: 123,
  PageUp: 92,
  PageDown: 93,
  ArrowUp: 19,
  ArrowDown: 20,
  ArrowLeft: 21,
  ArrowRight: 22,
  PrintScreen: 120,
  ScrollLock: 116,
  Pause: 121,
  Minus: 69,
  Equal: 70,
  BracketLeft: 71,
  BracketRight: 72,
  Backslash: 73,
  Semicolon: 74,
  Quote: 75,
  Backquote: 68,
  Comma: 55,
  Period: 56,
  Slash: 76,
  IntlBackslash: 73,
  NumpadMultiply: 17,
  NumpadAdd: 81,
  NumpadSubtract: 69,
  NumpadDecimal: 56,
  NumpadDivide: 154,
  NumLock: 143,
};

for (let i = 1; i <= 12; i += 1) {
  KEY_BY_CODE[`F${i}`] = 130 + i;
}

for (let i = 0; i <= 9; i += 1) {
  KEY_BY_CODE[`Digit${i}`] = 7 + i;
  KEY_BY_CODE[`Numpad${i}`] = 144 + i;
}

for (let i = 0; i < 26; i += 1) {
  KEY_BY_CODE[`Key${String.fromCharCode(65 + i)}`] = 29 + i;
}

function resolveKeycode(event) {
  const fromCode = KEY_BY_CODE[event.code];

  if (fromCode != null) {
    return fromCode;
  }

  const key = String(event.key ?? "");

  if (key.length === 1) {
    const code = key.toUpperCase().charCodeAt(0);

    if (code >= 65 && code <= 90) {
      return 29 + (code - 65);
    }

    if (code >= 48 && code <= 57) {
      return 7 + (code - 48);
    }
  }

  return null;
}

function buildMetastate(event) {
  let metastate = 0;

  if (event.shiftKey) metastate |= META_STATE.SHIFT_ON;
  if (event.altKey) metastate |= META_STATE.ALT_ON;
  if (event.ctrlKey) metastate |= META_STATE.CTRL_ON;
  if (event.metaKey) metastate |= META_STATE.META_ON;
  if (event.getModifierState?.("CapsLock")) metastate |= META_STATE.CAPS_LOCK_ON;
  if (event.getModifierState?.("NumLock")) metastate |= META_STATE.NUM_LOCK_ON;

  return metastate;
}

/**
 * Globally capture keyboard events and forward DOWN/UP.
 * @param {{
 *   root: HTMLElement,
 *   sendControl: (buffer: Uint8Array) => void,
 * }} options
 */
export function attachCastKeyboard(options) {
  const { root, sendControl } = options;

  root.tabIndex = 0;

  const onPointerDown = (event) => {
    if (!root.contains(event.target)) {
      return;
    }

    if (document.activeElement !== root && !root.contains(document.activeElement)) {
      root.focus({ preventScroll: true });
    }
  };

  const sendKeyEvent = (event, action) => {
    if (event.isComposing) {
      return;
    }

    if (!root.contains(document.activeElement) && document.activeElement !== root) {
      return;
    }

    const keycode = resolveKeycode(event);

    if (keycode == null) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    sendControl(
      serializeInjectKeycode({
        action,
        keycode,
        repeat: event.repeat && action === KEY_ACTION.DOWN ? 1 : 0,
        metastate: buildMetastate(event),
      }),
    );
  };

  const onKeyDown = (event) => {
    sendKeyEvent(event, KEY_ACTION.DOWN);
  };

  const onKeyUp = (event) => {
    sendKeyEvent(event, KEY_ACTION.UP);
  };

  root.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);

  return () => {
    root.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("keyup", onKeyUp, true);
    root.tabIndex = -1;
  };
}
