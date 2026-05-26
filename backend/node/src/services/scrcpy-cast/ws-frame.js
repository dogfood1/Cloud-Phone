import {
  SCRCPY_WS_FLAG_KEY_FRAME,
  SCRCPY_WS_FRAME_HEADER_SIZE,
} from "./scrcpy-packet-constants.js";

/**
 * @param {Buffer} payload MediaCodec access unit (config may be prepended by packet_merger)
 * @param {{ pts: bigint, key: boolean }} meta
 */
export function buildWsMediaFrame(payload, meta) {
  const frame = Buffer.allocUnsafe(SCRCPY_WS_FRAME_HEADER_SIZE + payload.length);

  frame[0] = meta.key ? SCRCPY_WS_FLAG_KEY_FRAME : 0;
  frame.writeBigUInt64BE(meta.pts, 1);
  payload.copy(frame, SCRCPY_WS_FRAME_HEADER_SIZE);

  return frame;
}
