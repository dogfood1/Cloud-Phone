import { Mp3Encoder } from "@breezystack/lamejs";

const MP3_BLOCK_SAMPLES = 1152;

/**
 * Encode interleaved s16le stereo PCM to MP3.
 * @param {Int16Array} interleavedStereo
 * @param {number} sampleRate
 * @param {number} kbps
 */
export function encodeInterleavedPcmToMp3(interleavedStereo, sampleRate = 48_000, kbps = 128) {
  if (!interleavedStereo?.length) {
    return null;
  }

  let encoder;

  try {
    encoder = new Mp3Encoder(2, sampleRate, kbps);
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "MP3 编码器初始化失败",
    );
  }

  const mp3Parts = [];
  const left = new Int16Array(MP3_BLOCK_SAMPLES);
  const right = new Int16Array(MP3_BLOCK_SAMPLES);

  for (let offset = 0; offset < interleavedStereo.length; offset += MP3_BLOCK_SAMPLES * 2) {
    const remainingFrames = Math.min(
      MP3_BLOCK_SAMPLES,
      Math.floor((interleavedStereo.length - offset) / 2),
    );

    if (remainingFrames <= 0) {
      break;
    }

    for (let i = 0; i < remainingFrames; i += 1) {
      const index = offset + i * 2;
      left[i] = interleavedStereo[index];
      right[i] = interleavedStereo[index + 1];
    }

    const encoded = encoder.encodeBuffer(
      left.subarray(0, remainingFrames),
      right.subarray(0, remainingFrames),
    );

    if (encoded.length > 0) {
      mp3Parts.push(new Uint8Array(encoded.buffer, encoded.byteOffset, encoded.byteLength));
    }
  }

  const flushed = encoder.flush();

  if (flushed.length > 0) {
    mp3Parts.push(new Uint8Array(flushed.buffer, flushed.byteOffset, flushed.byteLength));
  }

  if (!mp3Parts.length) {
    return null;
  }

  return new Blob(mp3Parts, { type: "audio/mpeg" });
}
