const DEVICE_MSG_TYPE = {
  CLIPBOARD: 0,
  ACK_CLIPBOARD: 1,
};

const MAGIC_MESSAGE = new TextEncoder().encode("scrcpy_message");

function startsWithMagic(bytes, magic) {
  if (bytes.length < magic.length) {
    return false;
  }

  for (let i = 0; i < magic.length; i += 1) {
    if (bytes[i] !== magic[i]) {
      return false;
    }
  }

  return true;
}

function readUtf8(bytes, offset, length) {
  return new TextDecoder().decode(bytes.subarray(offset, offset + length));
}

/**
 * @param {Uint8Array} bytes full WebSocket binary frame
 * @returns {{ type: string, text?: string, sequence?: bigint } | null}
 */
export function parseScrcpyDeviceMessage(bytes) {
  if (!startsWithMagic(bytes, MAGIC_MESSAGE)) {
    return null;
  }

  const payload = bytes.subarray(MAGIC_MESSAGE.length);

  if (payload.length < 1) {
    return null;
  }

  const type = payload[0];

  if (type === DEVICE_MSG_TYPE.CLIPBOARD) {
    if (payload.length < 5) {
      return null;
    }

    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    const length = view.getInt32(1, false);

    if (length < 0 || 5 + length > payload.length) {
      return null;
    }

    return {
      type: "clipboard",
      text: readUtf8(payload, 5, length),
    };
  }

  if (type === DEVICE_MSG_TYPE.ACK_CLIPBOARD) {
    if (payload.length < 9) {
      return null;
    }

    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    return {
      type: "ack_clipboard",
      sequence: view.getBigUint64(1, false),
    };
  }

  return null;
}
