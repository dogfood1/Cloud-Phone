import { buildAvcC, codecFromSps, findStartCodes, readNal } from "./h264-nal-parse.js";

function readAvccNals(buffer) {
  const nals = [];
  let offset = 0;

  while (offset + 4 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);

    if (length === 0 || offset + 4 + length > buffer.length) {
      break;
    }

    nals.push(buffer.subarray(offset + 4, offset + 4 + length));
    offset += 4 + length;
  }

  return nals;
}

/**
 * Parse MediaCodec config or merged packet prefix into WebCodecs description.
 * @param {Buffer} buffer
 */
export function parseH264CodecConfig(buffer) {
  if (!buffer?.length) {
    return null;
  }

  if (buffer[0] === 1 && buffer.length >= 7) {
    return {
      description: Uint8Array.from(buffer),
      codec: codecFromAvcC(buffer),
    };
  }

  const annexStarts = findStartCodes(buffer);

  if (annexStarts.length) {
    let sps = null;
    let pps = null;

    for (let index = 0; index < annexStarts.length; index += 1) {
      const end = index + 1 < annexStarts.length ? annexStarts[index + 1] : buffer.length;
      const nal = readNal(buffer, annexStarts[index], end);
      const type = nal[0] & 0x1f;

      if (type === 7) {
        sps = nal;
      } else if (type === 8) {
        pps = nal;
      }
    }

    if (sps && pps) {
      const description = buildAvcC(sps, pps);

      return {
        description,
        codec: codecFromSps(sps),
      };
    }
  }

  const nals = readAvccNals(buffer);
  let sps = null;
  let pps = null;

  for (const nal of nals) {
    const type = nal[0] & 0x1f;

    if (type === 7) {
      sps = nal;
    } else if (type === 8) {
      pps = nal;
    }
  }

  if (sps && pps) {
    const description = buildAvcC(sps, pps);

    return {
      description,
      codec: codecFromSps(sps),
    };
  }

  return null;
}

function extractFromAvcC(buffer) {
  // Parse avcC record produced by buildAvcC():
  // 0:1, 1-3: sps[1-3], 4:0xff, 5:0xe1,
  // 6-7: spsLen, 8..: sps,
  // then: 1 (numPps), 2 bytes ppsLen, then pps.
  if (!buffer || buffer.length < 8 || buffer[0] !== 1) {
    return null;
  }

  const spsLen = buffer.readUInt16BE(6);
  const spsStart = 8;
  const spsEnd = spsStart + spsLen;
  if (spsLen <= 0 || spsEnd > buffer.length) {
    return null;
  }

  const ppsCount = buffer.readUInt8(spsEnd);
  if (ppsCount < 1) {
    return null;
  }

  const ppsLenOffset = spsEnd + 1;
  if (ppsLenOffset + 2 > buffer.length) {
    return null;
  }

  const ppsLen = buffer.readUInt16BE(ppsLenOffset);
  const ppsStart = ppsLenOffset + 2;
  const ppsEnd = ppsStart + ppsLen;
  if (ppsLen <= 0 || ppsEnd > buffer.length) {
    return null;
  }

  const sps = buffer.subarray(spsStart, spsEnd);
  const pps = buffer.subarray(ppsStart, ppsEnd);

  return { sps, pps };
}

export function extractH264SpsPpsNals(buffer) {
  if (!buffer?.length) {
    return null;
  }

  // avcC record (buildAvcC output)
  if (buffer[0] === 1) {
    const fromAvcC = extractFromAvcC(buffer);
    if (fromAvcC?.sps && fromAvcC?.pps) {
      return fromAvcC;
    }
  }

  // Annex-B (already contains start codes)
  const annexStarts = findStartCodes(buffer);
  if (annexStarts.length) {
    let sps = null;
    let pps = null;

    for (let index = 0; index < annexStarts.length; index += 1) {
      const end = index + 1 < annexStarts.length ? annexStarts[index + 1] : buffer.length;
      const nal = readNal(buffer, annexStarts[index], end);
      const type = nal[0] & 0x1f;

      if (type === 7) {
        sps = nal;
      } else if (type === 8) {
        pps = nal;
      }
    }

    if (sps && pps) {
      return { sps, pps };
    }
  }

  // AVCC: length-prefixed NAL units
  const nals = readAvccNals(buffer);
  let sps = null;
  let pps = null;

  for (const nal of nals) {
    const type = nal[0] & 0x1f;
    if (type === 7) {
      sps = nal;
    } else if (type === 8) {
      pps = nal;
    }
  }

  if (sps && pps) {
    return { sps, pps };
  }

  return null;
}

function codecFromAvcC(record) {
  if (record.length < 4) {
    return "avc1.42E01E";
  }

  const profile = record[1].toString(16).padStart(2, "0");
  const compat = record[2].toString(16).padStart(2, "0");
  const level = record[3].toString(16).padStart(2, "0");

  return `avc1.${profile}${compat}${level}`;
}
