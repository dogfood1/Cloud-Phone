/**
 * ws-scrcpy compatible WebCodecs player (Annex-B H.264).
 *
 * Wire format: each WebSocket binary message is one or more Annex-B NAL units
 * (0x00000001 start codes). Logic aligned with NetrisTV/ws-scrcpy WebCodecsPlayer.
 */

import { codecFromSps } from "./h264-nal-utils.js";

function isStartCodeAt(bytes, offset) {
  return (
    offset + 4 <= bytes.length &&
    bytes[offset] === 0x00 &&
    bytes[offset + 1] === 0x00 &&
    bytes[offset + 2] === 0x00 &&
    bytes[offset + 3] === 0x01
  );
}

function nalTypeAt(bytes, offset) {
  if (!isStartCodeAt(bytes, offset)) {
    return null;
  }

  return bytes[offset + 4] & 0x1f;
}

export class WsScrcpyAnnexBPlayer {
  static isSupported() {
    return typeof VideoDecoder === "function";
  }

  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.container = canvas.parentElement;
    this.decoder = null;
    this.buffer = null;
    this.bufferedSps = false;
    this.bufferedPps = false;
    this.hadIdr = false;
    this.timestampUs = 0;
    this.lastError = "";

    this.resizeObserver = null;
    if (this.container) {
      this.resizeObserver = new ResizeObserver(() => this.#syncCanvasSize());
      this.resizeObserver.observe(this.container);
      this.#syncCanvasSize();
    }

    this.decoder = new VideoDecoder({
      output: (frame) => this.#drawFrame(frame),
      error: (error) => {
        this.lastError = error?.message ?? String(error);
      },
    });
  }

  #syncCanvasSize() {
    if (!this.container || !this.canvas || !this.ctx) {
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
    if (!this.ctx) {
      frame.close();
      return;
    }

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
    this.lastError = "";
  }

  #appendToBuffer(data) {
    if (this.buffer) {
      const merged = new Uint8Array(this.buffer.length + data.length);
      merged.set(this.buffer);
      merged.set(data, this.buffer.length);
      this.buffer = merged;
    } else {
      this.buffer = data.slice();
    }

    return this.buffer;
  }

  #configureFromSps(bytes) {
    if (!this.decoder || this.decoder.state === "closed") {
      return;
    }

    if (this.decoder.state === "configured") {
      return;
    }

    if (!isStartCodeAt(bytes, 0) || bytes.length < 9) {
      return;
    }

    const startCodeLen = 4;
    let nextStart = bytes.length;
    for (let i = startCodeLen; i + 4 <= bytes.length; i += 1) {
      if (isStartCodeAt(bytes, i)) {
        nextStart = i;
        break;
      }
    }

    const spsNal = bytes.subarray(startCodeLen, nextStart);
    if (spsNal.length < 4) {
      return;
    }

    try {
      const codec = codecFromSps(spsNal);
      this.decoder.configure({ codec, optimizeForLatency: true });
    } catch (error) {
      this.lastError = error?.message ?? String(error);
    }
  }

  pushFrame(arrayBuffer) {
    if (!arrayBuffer || !this.decoder || this.decoder.state === "closed") {
      return;
    }

    const bytes = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);

    if (bytes.length < 5 || !isStartCodeAt(bytes, 0)) {
      return;
    }

    const nalType = nalTypeAt(bytes, 0);
    const isIdr = nalType === 5;

    if (nalType === 7) {
      this.#configureFromSps(bytes);
      this.bufferedSps = true;
      this.#appendToBuffer(bytes);
      this.hadIdr = false;
      return;
    }

    if (nalType === 8) {
      this.bufferedPps = true;
      this.#appendToBuffer(bytes);
      return;
    }

    if (nalType === 6) {
      if (!this.bufferedSps || !this.bufferedPps) {
        return;
      }
    }

    const merged = this.#appendToBuffer(bytes);
    this.hadIdr = this.hadIdr || isIdr;

    if (!merged || this.decoder.state !== "configured" || !this.hadIdr) {
      return;
    }

    const chunkData = merged;
    this.buffer = null;
    this.bufferedPps = false;
    this.bufferedSps = false;

    try {
      this.decoder.decode(
        new EncodedVideoChunk({
          type: "key",
          timestamp: this.timestampUs,
          data: chunkData,
        }),
      );
      this.timestampUs += 33_333;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
    }
  }

  destroy() {
    try {
      this.resizeObserver?.disconnect();
    } catch {
      // ignore
    }

    this.resizeObserver = null;

    try {
      if (this.decoder && this.decoder.state !== "closed") {
        this.decoder.close();
      }
    } catch {
      // ignore
    }

    this.decoder = null;
    this.buffer = null;
  }
}
