const MAGIC_INITIAL = Buffer.from("scrcpy_initial", "utf8");
const MAGIC_MESSAGE = Buffer.from("scrcpy_message", "utf8");

const DEVICE_NAME_FIELD_LENGTH = 64;
const DISPLAY_INFO_LENGTH = 24;

function writePaddedUtf8(buffer, offset, text, length) {
  const bytes = Buffer.from(String(text ?? ""), "utf8");
  const slice = bytes.subarray(0, length);
  slice.copy(buffer, offset);
  buffer.fill(0, offset + slice.length, offset + length);
}

export function buildWsScrcpyInitialInfo({
  deviceName = "",
  videoWidth = 0,
  videoHeight = 0,
  clientId = 0,
}) {
  // Layout is compatible with ws-scrcpy `StreamReceiver.handleInitialInfo()`:
  // magic + deviceName(64) + displaysCount(int32) +
  //   [DisplayInfo(24) + connectionCount(int32) + screenInfoLen(int32) + screenInfo + videoSettingsLen(int32) + videoSettings] * N +
  // encodersCount(int32) + [nameLen(int32)+nameBytes]*M + clientId(int32)
  const displaysCount = 1;
  const screenInfoLen = 0;
  const videoSettingsLen = 0;
  const encodersCount = 0;
  const connectionCount = 0;

  const total =
    MAGIC_INITIAL.length +
    DEVICE_NAME_FIELD_LENGTH +
    4 + // displaysCount
    (DISPLAY_INFO_LENGTH + 4 + 4 + screenInfoLen + 4 + videoSettingsLen) * displaysCount +
    4 + // encodersCount
    4; // clientId

  const buffer = Buffer.alloc(total);
  let offset = 0;
  MAGIC_INITIAL.copy(buffer, offset);
  offset += MAGIC_INITIAL.length;

  writePaddedUtf8(buffer, offset, deviceName, DEVICE_NAME_FIELD_LENGTH);
  offset += DEVICE_NAME_FIELD_LENGTH;

  buffer.writeInt32BE(displaysCount, offset);
  offset += 4;

  // DisplayInfo (24 bytes)
  // displayId(int32)=0, width(int32), height(int32), rotation(int32)=0, layerStack(int32)=0, flags(int32)=0
  buffer.writeInt32BE(0, offset);
  offset += 4;
  buffer.writeInt32BE(videoWidth | 0, offset);
  offset += 4;
  buffer.writeInt32BE(videoHeight | 0, offset);
  offset += 4;
  buffer.writeInt32BE(0, offset);
  offset += 4;
  buffer.writeInt32BE(0, offset);
  offset += 4;
  buffer.writeInt32BE(0, offset);
  offset += 4;

  buffer.writeInt32BE(connectionCount, offset);
  offset += 4;

  buffer.writeInt32BE(screenInfoLen, offset);
  offset += 4;

  buffer.writeInt32BE(videoSettingsLen, offset);
  offset += 4;

  buffer.writeInt32BE(encodersCount, offset);
  offset += 4;

  buffer.writeInt32BE(clientId | 0, offset);
  offset += 4;

  return buffer.subarray(0, offset);
}

export function buildWsScrcpyClipboardMessage(text) {
  const bytes = Buffer.from(String(text ?? ""), "utf8");
  const payload = Buffer.alloc(1 + 4 + bytes.length);
  payload.writeUInt8(0, 0); // DeviceMessage.TYPE_CLIPBOARD
  payload.writeInt32BE(bytes.length, 1);
  bytes.copy(payload, 5);
  return Buffer.concat([MAGIC_MESSAGE, payload]);
}

