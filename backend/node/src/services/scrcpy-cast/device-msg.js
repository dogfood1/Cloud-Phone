/** scrcpy app/src/device_msg.h */
export const DEVICE_MSG_TYPE = {
  CLIPBOARD: 0,
  ACK_CLIPBOARD: 1,
  UHID_OUTPUT: 2,
};

function readString(buffer, offset) {
  const length = buffer.readUInt32BE(offset);
  const start = offset + 4;
  const end = start + length;

  if (end > buffer.length) {
    return { text: "", consumed: 0 };
  }

  return {
    text: buffer.toString("utf8", start, end),
    consumed: 4 + length,
  };
}

/**
 * @param {Buffer} buffer
 */
export function parseDeviceMessages(buffer) {
  const messages = [];
  let offset = 0;

  while (offset < buffer.length) {
    const type = buffer[offset];

    if (type === DEVICE_MSG_TYPE.CLIPBOARD) {
      const { text, consumed } = readString(buffer, offset + 1);

      if (!consumed) {
        break;
      }

      messages.push({ type: "clipboard", text });
      offset += 1 + consumed;
      continue;
    }

    if (type === DEVICE_MSG_TYPE.ACK_CLIPBOARD) {
      if (offset + 9 > buffer.length) {
        break;
      }

      messages.push({
        type: "ack_clipboard",
        sequence: buffer.readBigUInt64BE(offset + 1),
      });
      offset += 9;
      continue;
    }

    break;
  }

  return { messages, remaining: buffer.subarray(offset) };
}
