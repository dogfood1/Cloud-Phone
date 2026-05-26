import { buildAvcC, codecFromSps, findStartCodes, readNal } from "./h264-nal-utils.js";

function readAvccNals(buffer) {
  const nals = [];
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let offset = 0;

  while (offset + 4 <= buffer.byteLength) {
    const length = view.getUint32(offset);

    if (length === 0 || offset + 4 + length > buffer.byteLength) {
      break;
    }

    nals.push(buffer.subarray(offset + 4, offset + 4 + length));
    offset += 4 + length;
  }

  return nals;
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

export function parseH264CodecConfig(buffer) {
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  if (!data.length) {
    return null;
  }

  if (data[0] === 1 && data.length >= 7) {
    return {
      description: data,
      codec: codecFromAvcC(data),
    };
  }

  const annexStarts = findStartCodes(data);

  if (annexStarts.length) {
    let sps = null;
    let pps = null;

    for (let index = 0; index < annexStarts.length; index += 1) {
      const end = index + 1 < annexStarts.length ? annexStarts[index + 1] : data.length;
      const nal = readNal(data, annexStarts[index], end);
      const type = nal[0] & 0x1f;

      if (type === 7) {
        sps = nal;
      } else if (type === 8) {
        pps = nal;
      }
    }

    if (sps && pps) {
      return {
        description: buildAvcC(sps, pps),
        codec: codecFromSps(sps),
      };
    }
  }

  const nals = readAvccNals(data);
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
    return {
      description: buildAvcC(sps, pps),
      codec: codecFromSps(sps),
    };
  }

  return null;
}

export function descriptionFromBase64(value) {
  if (!value) {
    return null;
  }

  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
