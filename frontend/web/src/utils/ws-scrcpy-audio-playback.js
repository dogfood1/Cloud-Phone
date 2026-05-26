/** PCM playback (s16le stereo 48 kHz) for web cast — used with video or audio-only. */

import { MAGIC_AUDIO } from "./ws-scrcpy-audio-packet.js";

const SAMPLE_RATE = 48_000;
const CHANNELS = 2;

export class WsScrcpyAudioPlayback {
  constructor() {
    this.audioContext = null;
    this.gain = null;
    this.playhead = 0;
  }

  static isSupported() {
    return typeof window !== "undefined" && typeof AudioContext !== "undefined";
  }

  #ensureAudioContext() {
    if (this.audioContext) {
      return;
    }

    try {
      this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
      this.gain = this.audioContext.createGain();
      this.gain.gain.value = 1;
      this.gain.connect(this.audioContext.destination);
    } catch {
      this.audioContext = null;
      this.gain = null;
    }
  }

  async #resumeContext() {
    if (this.audioContext?.state === "suspended") {
      try {
        await this.audioContext.resume();
      } catch {
        // ignore
      }
    }
  }

  pushPcm(bytes) {
    const offset = MAGIC_AUDIO.length;
    const pcm = bytes.subarray(offset);

    if (pcm.byteLength < 4) {
      return;
    }

    const int16 = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 2));
    void this.#schedulePlayback(int16);
  }

  async #schedulePlayback(int16) {
    this.#ensureAudioContext();

    if (!this.audioContext || !this.gain) {
      return;
    }

    await this.#resumeContext();

    const frameCount = Math.floor(int16.length / CHANNELS);

    if (frameCount <= 0) {
      return;
    }

    const buffer = this.audioContext.createBuffer(CHANNELS, frameCount, SAMPLE_RATE);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < frameCount; i += 1) {
      left[i] = int16[i * 2] / 32768;
      right[i] = int16[i * 2 + 1] / 32768;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gain);

    const now = this.audioContext.currentTime;
    const startAt = Math.max(now, this.playhead);
    source.start(startAt);
    this.playhead = startAt + buffer.duration;
  }

  destroy() {
    try {
      this.audioContext?.close();
    } catch {
      // ignore
    }

    this.audioContext = null;
    this.gain = null;
    this.playhead = 0;
  }
}
