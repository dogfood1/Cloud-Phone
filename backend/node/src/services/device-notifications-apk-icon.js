import zlib from "node:zlib";

/**
 * @param {Buffer} buffer
 * @returns {Array<{ name: string, compressedSize: number, uncompressedSize: number, compression: number, localHeaderOffset: number }>}
 */
export function listZipEntries(buffer) {
  const eocdOffset = findEocdOffset(buffer);
  if (eocdOffset < 0) {
    return listZipEntriesSequential(buffer);
  }

  const centralDirOffset = buffer.readUInt32LE(eocdOffset + 16);
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  const entries = [];
  let offset = centralDirOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      break;
    }

    const compression = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");

    entries.push({
      name,
      compressedSize,
      uncompressedSize,
      compression,
      localHeaderOffset,
    });

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

/**
 * @param {Buffer} zipBuffer
 * @param {{ name: string, compressedSize: number, uncompressedSize: number, compression: number, localHeaderOffset: number }} entry
 * @returns {Buffer}
 */
export function extractZipEntry(zipBuffer, entry) {
  const localOffset = entry.localHeaderOffset;
  if (zipBuffer.readUInt32LE(localOffset) !== 0x04034b50) {
    throw new Error("invalid_local_header");
  }

  const nameLength = zipBuffer.readUInt16LE(localOffset + 26);
  const extraLength = zipBuffer.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + nameLength + extraLength;
  const compressed = zipBuffer.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.compression === 0) {
    return Buffer.from(compressed);
  }

  if (entry.compression === 8) {
    return zlib.inflateRawSync(compressed);
  }

  throw new Error(`unsupported_zip_compression_${entry.compression}`);
}

const LAUNCHER_NAME_RE = /(^|\/)(ic_launcher|ic_launcher_foreground|ic_launcher_round|icon)\.(png|webp)$/i;

/**
 * @param {Buffer} apkBuffer
 * @returns {Buffer | null}
 */
export function extractLauncherIconFromApk(apkBuffer) {
  const entries = listZipEntries(apkBuffer);
  const candidates = entries
    .filter((entry) => LAUNCHER_NAME_RE.test(entry.name) && entry.uncompressedSize > 0)
    .sort((a, b) => scoreLauncherName(b.name) - scoreLauncherName(a.name) || b.uncompressedSize - a.uncompressedSize);

  for (const entry of candidates) {
    try {
      const bytes = extractZipEntry(apkBuffer, entry);
      if (bytes.length > 32) {
        return bytes;
      }
    } catch {
      // try next
    }
  }

  return null;
}

function scoreLauncherName(name) {
  let value = 0;
  if (/xxxhdpi/i.test(name)) value += 40;
  else if (/xxhdpi/i.test(name)) value += 30;
  else if (/xhdpi/i.test(name)) value += 20;
  else if (/hdpi/i.test(name)) value += 10;
  if (/ic_launcher_foreground/i.test(name)) value += 5;
  if (/ic_launcher_round/i.test(name)) value += 3;
  if (/\.png$/i.test(name)) value += 2;
  return value;
}

function findEocdOffset(buffer) {
  const maxBack = Math.min(buffer.length, 0xffff + 22);
  for (let i = buffer.length - 22; i >= buffer.length - maxBack; i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      return i;
    }
  }
  return -1;
}

function listZipEntriesSequential(buffer) {
  const entries = [];
  let offset = 0;

  while (offset + 30 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const compression = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const uncompressedSize = buffer.readUInt32LE(offset + 22);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const name = buffer.subarray(offset + 30, offset + 30 + nameLength).toString("utf8");

    entries.push({
      name,
      compressedSize,
      uncompressedSize,
      compression,
      localHeaderOffset: offset,
    });

    offset += 30 + nameLength + extraLength + compressedSize;
  }

  return entries;
}
