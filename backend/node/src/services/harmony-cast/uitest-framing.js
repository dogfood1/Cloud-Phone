import { crc32 } from "node:zlib";

export const UITEST_HEADER = Buffer.from("_uitestkit_rpc_message_head_");
export const UITEST_TAILER = Buffer.from("_uitestkit_rpc_message_tail_");

export function buildUitestSessionId(payload) {
  const seed = `${Date.now()}${payload}`;
  return crc32(seed) >>> 0;
}

export function encodeUitestFrame(sessionId, body) {
  const bodyBuffer = Buffer.isBuffer(body) ? body : Buffer.from(body, "utf8");
  const header = Buffer.alloc(UITEST_HEADER.length + 8);
  UITEST_HEADER.copy(header, 0);
  header.writeUInt32BE(sessionId, UITEST_HEADER.length);
  header.writeUInt32BE(bodyBuffer.length, UITEST_HEADER.length + 4);
  return Buffer.concat([header, bodyBuffer, UITEST_TAILER]);
}

/**
 * @param {Buffer} buffer
 * @returns {{ frames: Array<{ sessionId: number, body: Buffer }>, rest: Buffer }}
 */
export function decodeUitestFrames(buffer) {
  /** @type {Array<{ sessionId: number, body: Buffer }>} */
  const frames = [];
  let offset = 0;

  while (buffer.length - offset >= UITEST_HEADER.length + 8) {
    if (!buffer.subarray(offset, offset + UITEST_HEADER.length).equals(UITEST_HEADER)) {
      offset += 1;
      continue;
    }

    const sessionId = buffer.readUInt32BE(offset + UITEST_HEADER.length);
    const bodyLength = buffer.readUInt32BE(offset + UITEST_HEADER.length + 4);
    const totalLength = UITEST_HEADER.length + 8 + bodyLength + UITEST_TAILER.length;

    if (buffer.length - offset < totalLength) {
      break;
    }

    const bodyStart = offset + UITEST_HEADER.length + 8;
    const body = buffer.subarray(bodyStart, bodyStart + bodyLength);
    const tail = buffer.subarray(bodyStart + bodyLength, bodyStart + bodyLength + UITEST_TAILER.length);

    if (!tail.equals(UITEST_TAILER)) {
      offset += 1;
      continue;
    }

    frames.push({ sessionId, body: Buffer.from(body) });
    offset += totalLength;
  }

  return {
    frames,
    rest: buffer.subarray(offset),
  };
}
