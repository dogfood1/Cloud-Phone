import fs from "node:fs/promises";
import zlib from "node:zlib";

const EOCD_SIG = 0x06054b50;
const CDFH_SIG = 0x02014b50;
const LFH_SIG = 0x04034b50;
const MAX_APK_BYTES = 55 * 1024 * 1024;

/**
 * Pick a launcher-ish PNG from an APK (ZIP) buffer.
 * @param {Buffer} buf
 * @returns {Buffer | null}
 */
export function extractLauncherPngFromApk(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 64 || buf.length > MAX_APK_BYTES) {
    return null;
  }

  const eocd = findEocdOffset(buf);

  if (eocd < 0) {
    return null;
  }

  const cdOffset = buf.readUInt32LE(eocd + 16);
  const cdEntries = buf.readUInt16LE(eocd + 10);
  let offset = cdOffset;
  /** @type {{ score: number, name: string, method: number, compSize: number, localOffset: number }[]} */
  const candidates = [];

  for (let i = 0; i < cdEntries && offset + 46 <= buf.length; i += 1) {
    if (buf.readUInt32LE(offset) !== CDFH_SIG) {
      break;
    }

    const compression = buf.readUInt16LE(offset + 10);
    const compSize = buf.readUInt32LE(offset + 20);
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    const localHeaderOffset = buf.readUInt32LE(offset + 42);

    const nameStart = offset + 46;
    const name = buf.toString("utf8", nameStart, nameStart + nameLen);

    if (name.endsWith(".png") && (name.includes("/mipmap-") || name.includes("/drawable"))) {
      const lower = name.toLowerCase();

      if (lower.includes("ic_launcher") || lower.includes("ic_launcher_foreground")) {
        candidates.push({
          score: scoreIconPath(lower),
          name,
          method: compression,
          compSize,
          localOffset: localHeaderOffset,
        });
      }
    }

    offset += 46 + nameLen + extraLen + commentLen;
  }

  if (!candidates.length) {
    return null;
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const bytes = readZipEntryBytes(buf, best);

  if (!bytes || bytes.length < 8 || bytes.readUInt32BE(0) !== 0x89504e47) {
    return null;
  }

  return bytes;
}

/**
 * @param {string} lowerPath
 */
function scoreIconPath(lowerPath) {
  let score = 10;

  if (lowerPath.includes("mipmap-xxxhdpi")) {
    score += 60;
  } else if (lowerPath.includes("mipmap-xxhdpi")) {
    score += 50;
  } else if (lowerPath.includes("mipmap-xhdpi")) {
    score += 40;
  } else if (lowerPath.includes("mipmap-hdpi")) {
    score += 30;
  } else if (lowerPath.includes("mipmap-mdpi")) {
    score += 20;
  } else if (lowerPath.includes("mipmap-anydpi")) {
    score += 35;
  } else if (lowerPath.includes("drawable-xxxhdpi")) {
    score += 25;
  } else if (lowerPath.includes("drawable-xxhdpi")) {
    score += 22;
  } else if (lowerPath.includes("drawable-xhdpi")) {
    score += 18;
  } else if (lowerPath.includes("drawable-hdpi")) {
    score += 14;
  } else if (lowerPath.includes("drawable-mdpi")) {
    score += 12;
  } else if (lowerPath.includes("/drawable/")) {
    score += 5;
  }

  if (lowerPath.includes("foreground")) {
    score += 3;
  }

  return score;
}

/**
 * @param {Buffer} buf
 */
function findEocdOffset(buf) {
  const min = Math.max(0, buf.length - 22 - 65_535);

  for (let i = buf.length - 22; i >= min; i -= 1) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      return i;
    }
  }

  return -1;
}

/**
 * @param {Buffer} buf
 * @param {{ method: number, compSize: number, localOffset: number }} entry
 */
function readZipEntryBytes(buf, entry) {
  const { method, compSize, localOffset } = entry;

  if (localOffset + 30 > buf.length) {
    return null;
  }

  if (buf.readUInt32LE(localOffset) !== LFH_SIG) {
    return null;
  }

  const nameLen = buf.readUInt16LE(localOffset + 26);
  const extraLen = buf.readUInt16LE(localOffset + 28);
  const dataOffset = localOffset + 30 + nameLen + extraLen;
  const end = dataOffset + compSize;

  if (end > buf.length || compSize <= 0) {
    return null;
  }

  const compressed = buf.subarray(dataOffset, end);

  if (method === 0) {
    return Buffer.from(compressed);
  }

  if (method === 8) {
    try {
      return zlib.inflateRawSync(compressed);
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * @param {string} apkPath
 */
export async function readLauncherPngFromApkFile(apkPath) {
  const st = await fs.stat(apkPath);

  if (!st.isFile() || st.size > MAX_APK_BYTES) {
    return null;
  }

  const buf = await fs.readFile(apkPath);
  return extractLauncherPngFromApk(buf);
}
