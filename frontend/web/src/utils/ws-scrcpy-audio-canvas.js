/** Device PCM: s16le stereo 48 kHz after `scrcpy_audio` magic (12 bytes). */

export const MAGIC_AUDIO = new TextEncoder().encode("scrcpy_audio");

const SAMPLE_RATE = 48_000;
const CHANNELS = 2;
const BAR_COUNT = 64;

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
    this.audioContext = null;
    this.analyser = null;
    this.gain = null;
    this.playhead = 0;
    this.resizeObserver = null;

    if (this.container) {
      this.resizeObserver = new ResizeObserver(() => this.#resize());
      this.resizeObserver.observe(this.container);
      this.#resize();
    }

    this.#ensureAudioContext();
    this.#startDrawLoop();
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
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.65;
      this.gain = this.audioContext.createGain();
      this.gain.gain.value = 1;
      this.gain.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    } catch {
      this.audioContext = null;
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

    this.receiving = true;
    this.statusText = "仅音频模式 · 播放中";

    const int16 = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 2));
    const rms = pcmRms(int16);

    for (let i = 0; i < this.levels.length - 1; i += 1) {
      this.levels[i] = this.levels[i + 1];
    }

    this.levels[this.levels.length - 1] = Math.min(1, rms * 4);

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
      const l = int16[i * 2] / 32768;
      const r = int16[i * 2 + 1] / 32768;
      left[i] = l;
      right[i] = r;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gain);

    const now = this.audioContext.currentTime;
    const startAt = Math.max(now, this.playhead);
    source.start(startAt);
    this.playhead = startAt + buffer.duration;
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

    try {
      this.audioContext?.close();
    } catch {
      // ignore
    }

    this.audioContext = null;
    this.analyser = null;
    this.gain = null;
  }
}
