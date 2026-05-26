export const SCRCPY_WS_FRAME_HEADER_SIZE = 9;
export const SCRCPY_WS_FLAG_KEY_FRAME = 0x01;

export function parseWsMediaFrame(buffer) {
  if (buffer.byteLength < SCRCPY_WS_FRAME_HEADER_SIZE) {
    return null;
  }

  const view = new DataView(
    buffer instanceof ArrayBuffer ? buffer : buffer.buffer,
    buffer.byteOffset ?? 0,
    buffer.byteLength,
  );

  const flags = view.getUint8(0);
  const pts = view.getBigUint64(1);
  const data = new Uint8Array(
    buffer instanceof ArrayBuffer ? buffer : buffer.buffer,
    (buffer.byteOffset ?? 0) + SCRCPY_WS_FRAME_HEADER_SIZE,
    buffer.byteLength - SCRCPY_WS_FRAME_HEADER_SIZE,
  );

  return {
    key: (flags & SCRCPY_WS_FLAG_KEY_FRAME) !== 0,
    pts,
    data,
  };
}
