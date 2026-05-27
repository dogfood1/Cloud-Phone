/** PCM playback (s16le stereo 48 kHz) for web cast — used with video or audio-only. */

import { MAGIC_AUDIO } from "./ws-scrcpy-audio-packet.js";

const DEVICE_PCM_SAMPLE_RATE = 48_000;
const CHANNELS = 2;

export function mergePcmRecordingChunks(chunks) {
  if (!chunks?.length) {
    return new Int16Array(0);
  }

  const totalSamples = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Int16Array(totalSamples);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

export class WsScrcpyAudioPlayback {
  constructor() {
    this.audioContext = null;
    this.gain = null;
    this.playhead = 0;
    this.pcmRecordingChunks = null;
  }

  isPcmRecordingActive() {
    return this.pcmRecordingChunks !== null;
  }

  beginPcmRecording() {
    this.pcmRecordingChunks = [];
    void this.resumeForUserPlayback();
  }

  endPcmRecording() {
    const chunks = this.pcmRecordingChunks;
    this.pcmRecordingChunks = null;
    return mergePcmRecordingChunks(chunks);
  }

  async resumeForUserPlayback() {
    this.ensureAudioContext();
    await this.#resumeContext();
  }

  ensureAudioContext() {
    if (this.audioContext) {
      return;
    }

    try {
      this.audioContext = new AudioContext();
      this.gain = this.audioContext.createGain();
      this.gain.gain.value = 1;
      this.gain.connect(this.audioContext.destination);
      this.playhead = this.audioContext.currentTime;
    } catch {
      this.audioContext = null;
      this.gain = null;
    }
  }

  #capturePcmForRecording(int16) {
    if (!this.pcmRecordingChunks) {
      return;
    }

    this.pcmRecordingChunks.push(int16.slice());
  }

  static isSupported() {
    return typeof window !== "undefined" && typeof AudioContext !== "undefined";
  }

  async #resumeContext() {
    if (!this.audioContext) {
      return;
    }

    if (this.audioContext.state === "suspended") {
      try {
        await this.audioContext.resume();
      } catch {
        // ignore
      }
    }

    if (this.playhead < this.audioContext.currentTime) {
      this.playhead = this.audioContext.currentTime;
    }
  }

  pushPcm(bytes) {
    const offset = MAGIC_AUDIO.length;
    const pcm = bytes.subarray(offset);

    if (pcm.byteLength < 4) {
      return;
    }

    const pcmCopy = pcm.slice();
    const int16 = new Int16Array(
      pcmCopy.buffer,
      pcmCopy.byteOffset,
      Math.floor(pcmCopy.byteLength / 2),
    );
    this.#capturePcmForRecording(int16);
    void this.#schedulePlayback(int16);
  }

  async #schedulePlayback(int16) {
    this.ensureAudioContext();

    if (!this.audioContext || !this.gain) {
      return;
    }

    await this.#resumeContext();

    const frameCount = Math.floor(int16.length / CHANNELS);

    if (frameCount <= 0) {
      return;
    }

    const buffer = this.audioContext.createBuffer(
      CHANNELS,
      frameCount,
      DEVICE_PCM_SAMPLE_RATE,
    );
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
    this.pcmRecordingChunks = null;
  }
}
