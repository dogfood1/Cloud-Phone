import { logCastInfo } from "./cast-logger.js";
import { shouldLogPacketSummary, summarizeWsPacket } from "./ws-packet-summary.js";

export function toBuffer(data) {
  if (Buffer.isBuffer(data)) {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  return Buffer.from(data);
}

/** Peek first bytes without copying the payload (critical at 60fps). */
function peekByte(data, index) {
  if (Buffer.isBuffer(data) || ArrayBuffer.isView(data)) {
    return index < data.byteLength ? data[index] : undefined;
  }
  if (data instanceof ArrayBuffer) {
    return index < data.byteLength ? new Uint8Array(data, index, 1)[0] : undefined;
  }
  return undefined;
}

export function isLikelyVideoAnnexB(data) {
  const b0 = peekByte(data, 0);
  const b1 = peekByte(data, 1);
  if (b0 !== 0x00 || b1 !== 0x00) {
    return false;
  }
  const b2 = peekByte(data, 2);
  if (b2 === 0x01) {
    return true;
  }
  return b2 === 0x00 && peekByte(data, 3) === 0x01;
}

export function logProxyPacket(serial, direction, data, counters) {
  if (direction === "remote_to_client" && isLikelyVideoAnnexB(data)) {
    counters.remoteVideo = (counters.remoteVideo ?? 0) + 1;
    const count = counters.remoteVideo;
    if (count > 2 && count % 600 !== 0) {
      return;
    }
  }

  const buffer = toBuffer(data);
  const summary = summarizeWsPacket(buffer);
  if (!shouldLogPacketSummary(summary, counters, direction)) {
    return;
  }
  logCastInfo(serial, `ws.proxy.${direction}`, summary);
}

/** Drop late video when the browser socket is backlogged. */
export const CLIENT_BACKLOG_DROP_BYTES = 512 * 1024;
