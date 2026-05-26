/**
 * Minimal ws-scrcpy compatible WebCodecs player.
 *
 * Input frames: Uint8Array of Annex-B NAL units with 0x00000001 start codes.
 * The player buffers SPS/PPS (+ optional SEI) until first IDR, then decodes.
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

function findFirstNalType(bytes) {
  for (let i = 0; i + 5 <= bytes.length; i += 1) {
    if (isStartCodeAt(bytes, i)) {
      return bytes[i + 4] & 0x1f;
    }
  }
  return null;
}

function isIdr(bytes) {
  for (let i = 0; i + 5 <= bytes.length; i += 1) {
    if (isStartCodeAt(bytes, i)) {
      const type = bytes[i + 4] & 0x1f;
      if (type === 5) {
        return true;
      }
    }
  }
  return false;
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
    this.bufferParts = [];
    this.hasSps = false;
    this.hasPps = false;
    this.hadIdr = false;
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

  #maybeConfigureFromSps(spsNal) {
    try {
      if (!this.decoder || this.decoder.state === "closed") {
        return;
      }

      if (this.decoder.state === "configured") {
        return;
      }

      if (!spsNal || spsNal.length < 4) {
        return;
      }

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

    const nalType = findFirstNalType(bytes);
    if (nalType === 7) {
      this.hasSps = true;
      // Extract the first SPS NAL (without the Annex-B start code prefix).
      const startCodeLen = isStartCodeAt(bytes, 0) ? 4 : 3;
      let nextStart = bytes.length;
      for (let i = startCodeLen; i + 4 <= bytes.length; i += 1) {
        if (i + 3 < bytes.length) {
          if (
            bytes[i] === 0x00 &&
            bytes[i + 1] === 0x00 &&
            ((bytes[i + 2] === 0x01) || (bytes[i + 2] === 0x00 && i + 3 < bytes.length && bytes[i + 3] === 0x01))
          ) {
            nextStart = i;
            break;
          }
        }
      }
      const spsNal = bytes.subarray(startCodeLen, nextStart);
      this.#maybeConfigureFromSps(spsNal);
    } else if (nalType === 8) {
      this.hasPps = true;
    }

    // Buffer until we have SPS+PPS and first IDR.
    this.bufferParts.push(bytes);
    this.hadIdr = this.hadIdr || isIdr(bytes);

    if (!this.hasSps || !this.hasPps || !this.hadIdr) {
      return;
    }

    if (this.decoder.state !== "configured") {
      return;
    }

    const total = this.bufferParts.reduce((sum, part) => sum + part.length, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const part of this.bufferParts) {
      merged.set(part, offset);
      offset += part.length;
    }
    this.bufferParts.length = 0;
    this.hasSps = false;
    this.hasPps = false;

    try {
      this.decoder.decode(
        new EncodedVideoChunk({
          type: "key",
          timestamp: 0,
          data: merged,
        }),
      );
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
    this.bufferParts = [];
  }
}

