import { descriptionFromBase64, parseH264CodecConfig } from "./h264-config.js";
import { parseWsMediaFrame } from "./scrcpy-frame.js";

/**
 * WebCodecs player for scrcpy-framed media packets (one MediaCodec buffer per frame).
 */
export class ScrcpyH264Player {
  constructor(canvas, initialConfig = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.container = canvas.parentElement;
    this.decoder = null;
    this.configured = false;
    this.configureToken = 0;
    this.codecConfig = initialConfig;
    this.frameCount = 0;
    this.needsKeyFrame = true;
    this.resizeObserver = null;
    this.lastError = "";
    this.decodedFrames = 0;

    if (this.container) {
      this.resizeObserver = new ResizeObserver(() => this.#syncCanvasSize());
      this.resizeObserver.observe(this.container);
      this.#syncCanvasSize();
    }

    if (initialConfig) {
      void this.#configure(initialConfig.codec, initialConfig.description);
    }
  }

  #syncCanvasSize() {
    if (!this.container) {
      return;
    }

    const width = Math.max(1, Math.floor(this.container.clientWidth));
    const height = Math.max(1, Math.floor(this.container.clientHeight));

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.ctx.fillStyle = "#000";
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  #drawFrame(frame) {
    this.#syncCanvasSize();

    const viewWidth = this.canvas.width;
    const viewHeight = this.canvas.height;
    const frameWidth = frame.displayWidth;
    const frameHeight = frame.displayHeight;
    const scale = Math.min(viewWidth / frameWidth, viewHeight / frameHeight);
    const drawWidth = Math.round(frameWidth * scale);
    const drawHeight = Math.round(frameHeight * scale);
    const offsetX = Math.floor((viewWidth - drawWidth) / 2);
    const offsetY = Math.floor((viewHeight - drawHeight) / 2);

    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, viewWidth, viewHeight);
    this.ctx.drawImage(frame, offsetX, offsetY, drawWidth, drawHeight);
    frame.close();
    this.decodedFrames += 1;
    this.lastError = "";
  }

  handleCodecMessage(message) {
    const description = descriptionFromBase64(message.description);

    if (!description) {
      return;
    }

    void this.#configure(message.codec, description);
  }

  pushFrame(buffer) {
    const frame = parseWsMediaFrame(buffer);

    if (!frame) {
      return;
    }

    if (!this.configured) {
      const parsed = parseH264CodecConfig(frame.data);

      if (parsed) {
        void this.#configure(parsed.codec, parsed.description);
      }
    }

    if (!this.configured || !this.decoder) {
      return;
    }

    if (!frame.key && this.needsKeyFrame) {
      return;
    }

    const timestamp = Number(frame.pts);

    try {
      this.decoder.decode(
        new EncodedVideoChunk({
          type: frame.key ? "key" : "delta",
          timestamp: Number.isFinite(timestamp) ? timestamp : this.frameCount * 33_333,
          data: frame.data,
        }),
      );
      this.frameCount += 1;

      if (frame.key) {
        this.needsKeyFrame = false;
      }
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "decode failed";
      this.needsKeyFrame = true;
    }
  }

  async #configure(codec, description) {
    if (!codec || !description?.length || !("VideoDecoder" in window)) {
      return;
    }

    const token = ++this.configureToken;
    const candidates = [
      { codec, description, optimizeForLatency: true, hardwareAcceleration: "prefer-hardware" },
      { codec, description, optimizeForLatency: true, hardwareAcceleration: "no-preference" },
      { codec, description, optimizeForLatency: true, hardwareAcceleration: "prefer-software" },
    ];

    for (const config of candidates) {
      if (token !== this.configureToken) {
        return;
      }

      let supported = true;

      try {
        const result = await VideoDecoder.isConfigSupported(config);
        supported = Boolean(result.supported);
      } catch {
        supported = true;
      }

      if (!supported) {
        continue;
      }

      this.#resetDecoder();

      this.decoder = new VideoDecoder({
        output: (videoFrame) => {
          this.#drawFrame(videoFrame);
        },
        error: (error) => {
          this.lastError = error instanceof Error ? error.message : "decoder error";
          this.configured = false;
          this.needsKeyFrame = true;
        },
      });

      try {
        this.decoder.configure(config);
        this.configured = true;
        this.codecConfig = { codec, description };
        this.lastError = "";
        return;
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : "configure failed";
        this.#resetDecoder();
      }
    }

    if (token === this.configureToken) {
      this.lastError = `H.264 配置失败 (${codec})`;
    }
  }

  #resetDecoder() {
    if (this.decoder) {
      try {
        this.decoder.close();
      } catch {
        // ignore
      }
    }

    this.decoder = null;
    this.configured = false;
    this.needsKeyFrame = true;
    this.frameCount = 0;
  }

  destroy() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.#resetDecoder();
    this.lastError = "";
    this.decodedFrames = 0;
  }

  static isSupported() {
    return typeof window !== "undefined" && "VideoDecoder" in window;
  }
}
