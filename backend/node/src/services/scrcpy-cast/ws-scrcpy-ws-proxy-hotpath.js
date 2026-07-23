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

function asByteView(data) {
  if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
    return data;
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  return null;
}

function startCodeLenAt(bytes, offset) {
  if (offset + 3 > bytes.length || bytes[offset] !== 0x00 || bytes[offset + 1] !== 0x00) {
    return 0;
  }
  if (bytes[offset + 2] === 0x01) {
    return 3;
  }
  if (offset + 4 <= bytes.length && bytes[offset + 2] === 0x00 && bytes[offset + 3] === 0x01) {
    return 4;
  }
  return 0;
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

/** SPS / PPS / IDR — never drop under backlog or recovery stalls forever. */
export function isLikelyKeyframeAnnexB(data) {
  if (!isLikelyVideoAnnexB(data)) {
    return false;
  }
  const bytes = asByteView(data);
  if (!bytes || bytes.length < 5) {
    return false;
  }
  let i = 0;
  while (i + 4 < bytes.length) {
    const sc = startCodeLenAt(bytes, i);
    if (!sc) {
      i += 1;
      continue;
    }
    const nalType = bytes[i + sc] & 0x1f;
    if (nalType === 5 || nalType === 7 || nalType === 8) {
      return true;
    }
    i += sc + 1;
  }
  return false;
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

/** Drop late non-key video only under severe browser WS backlog (~2MB). */
export const CLIENT_BACKLOG_DROP_BYTES = 2 * 1024 * 1024;
