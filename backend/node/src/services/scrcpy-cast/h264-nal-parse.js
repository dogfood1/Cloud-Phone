export function findStartCodes(buffer) {
  const indices = [];

  for (let index = 0; index < buffer.length - 3; index += 1) {
    if (buffer[index] === 0 && buffer[index + 1] === 0) {
      if (buffer[index + 2] === 1) {
        indices.push(index);
        index += 2;
      } else if (buffer[index + 2] === 0 && buffer[index + 3] === 1) {
        indices.push(index);
        index += 3;
      }
    }
  }

  return indices;
}

export function readNal(buffer, startIndex, endIndex) {
  let headerSize = 3;

  if (buffer[startIndex + 2] === 0) {
    headerSize = 4;
  }

  return buffer.subarray(startIndex + headerSize, endIndex);
}

export function buildAvcC(sps, pps) {
  const record = new Uint8Array(7 + 2 + sps.length + 1 + 2 + pps.length);
  let offset = 0;

  record[offset++] = 1;
  record[offset++] = sps[1];
  record[offset++] = sps[2];
  record[offset++] = sps[3];
  record[offset++] = 0xff;
  record[offset++] = 0xe1;
  record[offset++] = (sps.length >> 8) & 0xff;
  record[offset++] = sps.length & 0xff;
  record.set(sps, offset);
  offset += sps.length;
  record[offset++] = 1;
  record[offset++] = (pps.length >> 8) & 0xff;
  record[offset++] = pps.length & 0xff;
  record.set(pps, offset);

  return record;
}

export function codecFromSps(sps) {
  const profile = sps[1].toString(16).padStart(2, "0");
  const compat = sps[2].toString(16).padStart(2, "0");
  const level = sps[3].toString(16).padStart(2, "0");

  return `avc1.${profile}${compat}${level}`;
}
