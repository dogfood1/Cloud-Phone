/** Device PCM WebSocket packets: `scrcpy_audio` magic + s16le stereo 48 kHz. */

export const MAGIC_AUDIO = new TextEncoder().encode("scrcpy_audio");

export function isScrcpyAudioPacket(bytes) {
  if (bytes.length < MAGIC_AUDIO.length) {
    return false;
  }

  for (let i = 0; i < MAGIC_AUDIO.length; i += 1) {
    if (bytes[i] !== MAGIC_AUDIO[i]) {
      return false;
    }
  }

  return true;
}
