/** Device PCM: s16le stereo 48 kHz after `scrcpy_audio` magic (12 bytes). */

import { MAGIC_AUDIO, isScrcpyAudioPacket } from "./ws-scrcpy-audio-packet.js";
import {
  mergePcmRecordingChunks,
  WsScrcpyAudioPlayback,
} from "./ws-scrcpy-audio-playback.js";

export { MAGIC_AUDIO, isScrcpyAudioPacket };

const BAR_COUNT = 64;

function pcmRms(int16View) {
  if (!int16View.length) {
    return 0;
  }

  let sum = 0;

  for (let i = 0; i < int16View.length; i += 1) {
    const sample = int16View[i] / 32768;
    sum += sample * sample;
  }

  return Math.sqrt(sum / int16View.length);
}

export class WsScrcpyAudioCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.container = canvas.parentElement;
    this.levels = new Float32Array(BAR_COUNT);
    this.frameId = 0;
    this.receiving = false;
    this.statusText = "仅音频模式 · 等待设备音频…";
    this.playback = new WsScrcpyAudioPlayback();
    this.pcmRecordingChunks = null;
    this.analyser = null;
    this.resizeObserver = null;

    if (this.container) {
      this.resizeObserver = new ResizeObserver(() => this.#resize());
      this.resizeObserver.observe(this.container);
      this.#resize();
    }

    this.#startDrawLoop();
  }

  isPcmRecordingActive() {
    return this.pcmRecordingChunks !== null;
  }

  beginPcmRecording() {
    this.pcmRecordingChunks = [];
    void this.playback.resumeForUserPlayback();
  }

  async resumeForUserPlayback() {
    await this.playback?.resumeForUserPlayback?.();
  }

  endPcmRecording() {
    const canvasChunks = this.pcmRecordingChunks;
    this.pcmRecordingChunks = null;
    return mergePcmRecordingChunks(canvasChunks);
  }

  #ensureAnalyser() {
    this.playback.ensureAudioContext();
    const ctx = this.playback.audioContext;

    if (!ctx || this.analyser || !this.playback.gain) {
      return;
    }

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.65;
    this.playback.gain.disconnect();
    this.playback.gain.connect(this.analyser);
    this.analyser.connect(ctx.destination);
  }

  static isSupported() {
    return WsScrcpyAudioPlayback.isSupported();
  }

  #resize() {
    if (!this.container || !this.canvas) {
      return;
    }

    const width = Math.max(1, Math.floor(this.container.clientWidth));
    const height = Math.max(1, Math.floor(this.container.clientHeight));
    this.canvas.width = width;
    this.canvas.height = height;
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

    if (this.pcmRecordingChunks) {
      this.pcmRecordingChunks.push(int16.slice());
    }

    this.receiving = true;
    this.statusText = "仅音频模式 · 播放中";

    const rms = pcmRms(int16);

    for (let i = 0; i < this.levels.length - 1; i += 1) {
      this.levels[i] = this.levels[i + 1];
    }

    this.levels[this.levels.length - 1] = Math.min(1, rms * 4);

    this.playback.pushPcm(bytes);
    this.#ensureAnalyser();
  }

  #startDrawLoop() {
    const draw = () => {
      this.#drawFrame();
      this.frameId = requestAnimationFrame(draw);
    };

    this.frameId = requestAnimationFrame(draw);
  }

  #drawFrame() {
    const { ctx, canvas } = this;

    if (!ctx || !canvas) {
      return;
    }

    const width = canvas.width;
    const height = canvas.height;
    const midY = height * 0.5;

    ctx.fillStyle = "#0a0e14";
    ctx.fillRect(0, 0, width, height);

    const barWidth = width / BAR_COUNT;
    const time = performance.now() * 0.002;

    for (let i = 0; i < BAR_COUNT; i += 1) {
      const idle = 0.08 + 0.06 * Math.sin(time + i * 0.35);
      const level = this.receiving ? this.levels[i] : idle;
      const barHeight = Math.max(4, level * height * 0.42);
      const x = i * barWidth + barWidth * 0.15;
      const w = barWidth * 0.7;

      const gradient = ctx.createLinearGradient(0, midY - barHeight, 0, midY + barHeight);
      gradient.addColorStop(0, "#3b82f6");
      gradient.addColorStop(0.5, "#60a5fa");
      gradient.addColorStop(1, "#3b82f6");

      ctx.fillStyle = gradient;
      ctx.fillRect(x, midY - barHeight, w, barHeight * 2);
    }

    if (this.analyser && this.receiving) {
      const freq = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(freq);

      ctx.strokeStyle = "rgba(96, 165, 250, 0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();

      const step = Math.max(1, Math.floor(freq.length / BAR_COUNT));

      for (let i = 0; i < BAR_COUNT; i += 1) {
        const value = freq[i * step] / 255;
        const y = midY - value * height * 0.35;
        const x = i * barWidth + barWidth * 0.5;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    }

    ctx.fillStyle = "rgba(226, 232, 240, 0.75)";
    ctx.font = "13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.statusText, width / 2, height - 16);
  }

  destroy() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.pcmRecordingChunks = null;

    this.playback?.destroy();
    this.playback = null;
    this.analyser = null;
  }
}
