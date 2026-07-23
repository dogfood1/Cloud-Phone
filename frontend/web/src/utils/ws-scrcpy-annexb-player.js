/**
 * ws-scrcpy compatible WebCodecs player (Annex-B H.264).
 * Splits multi-NAL packets (SPS+PPS+IDR often arrive in one MediaCodec buffer).
 */

import { codecFromSps } from "./h264-nal-utils.js";

function startCodeLenAt(bytes, offset) {
  if (offset + 3 > bytes.length || bytes[offset] !== 0x00 || bytes[offset + 1] !== 0x00) {
    return 0;
  }
  if (bytes[offset + 2] === 0x01) {
    return 3;
  }
  if (offset + 4 <= bytes.length && bytes[offset + 2] === 0x00 && bytes[offset + 3] === 0x01) {
    return 4;
  }
  return 0;
}

/** @param {Uint8Array} bytes */
function splitAnnexBNals(bytes) {
  const nals = [];
  let i = 0;
  while (i < bytes.length) {
    const sc = startCodeLenAt(bytes, i);
    if (!sc) {
      i += 1;
      continue;
    }
    let next = bytes.length;
    for (let j = i + sc; j < bytes.length; j += 1) {
      if (startCodeLenAt(bytes, j)) {
        next = j;
        break;
      }
    }
    nals.push(bytes.subarray(i, next));
    i = next;
  }
  return nals;
}

function nalTypeOf(nal) {
  const sc = startCodeLenAt(nal, 0);
  if (!sc || nal.length <= sc) {
    return null;
  }
  return nal[sc] & 0x1f;
}

export class WsScrcpyAnnexBPlayer {
  static isSupported() {
    return typeof VideoDecoder === "function";
  }

  constructor(canvas) {
    this.canvas = canvas;
    this.ctx =
      canvas.getContext("2d", { alpha: false, desynchronized: true }) ||
      canvas.getContext("2d");
    this.decoder = null;
    this.accessUnit = null;
    this.hadIdr = false;
    this.needIdr = false;
    this.baseTimeUs = 0;
    this.lastError = "";
    this.videoFrameSize = { width: 0, height: 0 };
    this.onVideoFrameSize = null;
    this.onFirstFrameRendered = null;
    /** @type {null | (() => void)} */
    this.onNeedKeyframe = null;
    this.hasRenderedFrame = false;
    /** @type {VideoFrame | null} */
    this.pendingFrame = null;
    this.rafId = 0;
    this._lastKeyframeRequestAt = 0;

    if (this.canvas) {
      this.canvas.style.width = "100%";
      this.canvas.style.height = "100%";
      this.canvas.style.objectFit = "contain";
    }

    this.#createDecoder();
  }

  #createDecoder() {
    this.decoder = new VideoDecoder({
      output: (frame) => this.#queueFrame(frame),
      error: (error) => {
        this.lastError = error?.message ?? String(error);
        this.#markNeedKeyframe(true);
      },
    });
  }

  #ensureDecoder() {
    if (this.decoder && this.decoder.state !== "closed") {
      return;
    }
    this.#createDecoder();
    this.hadIdr = false;
    this.accessUnit = null;
    this.#markNeedKeyframe(true);
  }

  #markNeedKeyframe(requestImmediate = false) {
    this.needIdr = true;
    if (!requestImmediate) {
      return;
    }
    const now = performance.now();
    if (now - this._lastKeyframeRequestAt < 2000) {
      return;
    }
    this._lastKeyframeRequestAt = now;
    try {
      this.onNeedKeyframe?.();
    } catch {
      // ignore
    }
  }

  #nowUs() {
    if (!this.baseTimeUs) {
      this.baseTimeUs = Math.round(performance.now() * 1000);
    }
    return Math.round(performance.now() * 1000) - this.baseTimeUs;
  }

  #queueFrame(frame) {
    if (this.pendingFrame) {
      this.pendingFrame.close();
    }
    this.pendingFrame = frame;
    if (this.rafId) {
      return;
    }
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      const next = this.pendingFrame;
      this.pendingFrame = null;
      if (next) {
        this.#drawFrame(next);
      }
    });
  }

  #drawFrame(frame) {
    if (!this.ctx) {
      frame.close();
      return;
    }

    const frameWidth = frame.displayWidth;
    const frameHeight = frame.displayHeight;
    if (frameWidth > 0 && frameHeight > 0) {
      if (this.canvas.width !== frameWidth || this.canvas.height !== frameHeight) {
        this.canvas.width = frameWidth;
        this.canvas.height = frameHeight;
      }
      if (
        this.videoFrameSize.width !== frameWidth ||
        this.videoFrameSize.height !== frameHeight
      ) {
        this.videoFrameSize = { width: frameWidth, height: frameHeight };
        this.onVideoFrameSize?.(this.videoFrameSize);
      }
    }

    this.ctx.drawImage(frame, 0, 0);
    frame.close();
    if (!this.hasRenderedFrame) {
      this.hasRenderedFrame = true;
      this.onFirstFrameRendered?.();
    }
    this.lastError = "";
  }

  #appendAu(nal) {
    if (this.accessUnit) {
      const merged = new Uint8Array(this.accessUnit.length + nal.length);
      merged.set(this.accessUnit);
      merged.set(nal, this.accessUnit.length);
      this.accessUnit = merged;
    } else {
      this.accessUnit = nal.slice();
    }
  }

  #configureFromSpsNal(nal) {
    this.#ensureDecoder();
    if (!this.decoder || this.decoder.state === "closed" || this.decoder.state === "configured") {
      return;
    }
    const sc = startCodeLenAt(nal, 0);
    if (!sc || nal.length < sc + 4) {
      return;
    }
    const spsRbsp = nal.subarray(sc);
    try {
      this.decoder.configure({
        codec: codecFromSps(spsRbsp),
        optimizeForLatency: true,
        hardwareAcceleration: "prefer-hardware",
      });
    } catch (error) {
      try {
        this.decoder.configure({
          codec: codecFromSps(spsRbsp),
          optimizeForLatency: true,
          hardwareAcceleration: "prefer-software",
        });
      } catch (error2) {
        this.lastError = error2?.message ?? String(error2);
      }
    }
  }

  #flushAccessUnit(isKey) {
    this.#ensureDecoder();
    if (!this.accessUnit || !this.decoder || this.decoder.state !== "configured") {
      this.accessUnit = null;
      return;
    }
    // Only skip P-frames after a real decode fault. Mid-GOP drops + needIdr
    // freeze until the next IDR and look like rhythmic stutter.
    if (this.needIdr && !isKey) {
      this.accessUnit = null;
      return;
    }
    try {
      this.decoder.decode(
        new EncodedVideoChunk({
          type: isKey ? "key" : "delta",
          timestamp: this.#nowUs(),
          data: this.accessUnit,
        }),
      );
      if (isKey) {
        this.needIdr = false;
        this.hadIdr = true;
      }
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.#markNeedKeyframe(true);
    }
    this.accessUnit = null;
  }

  /** @param {Uint8Array} nal */
  #pushNal(nal) {
    const nalType = nalTypeOf(nal);
    if (nalType == null) {
      return;
    }

    if (nalType === 7) {
      this.#configureFromSpsNal(nal);
      this.accessUnit = null;
      this.#appendAu(nal);
      return;
    }
    if (nalType === 8 || nalType === 6 || nalType === 9) {
      this.#appendAu(nal);
      return;
    }

    const isIdr = nalType === 5;
    if (!this.hadIdr && !isIdr) {
      return;
    }

    this.#appendAu(nal);
    this.#flushAccessUnit(isIdr);
  }

  pushFrame(arrayBuffer) {
    if (!arrayBuffer) {
      return;
    }
    this.#ensureDecoder();
    const bytes = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
    if (bytes.length < 4 || !startCodeLenAt(bytes, 0)) {
      return;
    }

    const nals = splitAnnexBNals(bytes);
    if (!nals.length) {
      return;
    }
    for (const nal of nals) {
      this.#pushNal(nal);
    }
  }

  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    if (this.pendingFrame) {
      this.pendingFrame.close();
      this.pendingFrame = null;
    }
    try {
      if (this.decoder && this.decoder.state !== "closed") {
        this.decoder.close();
      }
    } catch {
      // ignore
    }
    this.decoder = null;
    this.accessUnit = null;
    this.onNeedKeyframe = null;
  }
}
