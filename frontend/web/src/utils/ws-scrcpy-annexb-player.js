/**
 * ws-scrcpy / WebCodecs Annex-B player aligned with upstream WebCodecsPlayer:
 * feed each MediaCodec buffer as one EncodedVideoChunk when possible.
 * Display keeps only the latest frame (same idea as desktop sc_frame_buffer).
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

function nalTypeAt(bytes, offset) {
  const sc = startCodeLenAt(bytes, offset);
  if (!sc || offset + sc >= bytes.length) {
    return null;
  }
  return bytes[offset + sc] & 0x1f;
}

function packetHasIdr(bytes) {
  let i = 0;
  while (i + 4 < bytes.length) {
    const sc = startCodeLenAt(bytes, i);
    if (!sc) {
      i += 1;
      continue;
    }
    if ((bytes[i + sc] & 0x1f) === 5) {
      return true;
    }
    let next = bytes.length;
    for (let j = i + sc + 1; j + 3 < bytes.length; j += 1) {
      if (startCodeLenAt(bytes, j)) {
        next = j;
        break;
      }
    }
    i = next;
  }
  return false;
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
    this.hadIdr = false;
    this.needIdr = false;
    this.frameIndex = 0;
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

  #queueFrame(frame) {
    // Same as desktop sc_frame_buffer: keep only the latest decoded frame.
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

  #configureFromSps(spsNal) {
    this.#ensureDecoder();
    if (!this.decoder || this.decoder.state === "closed") {
      return;
    }
    if (this.decoder.state === "configured") {
      try {
        this.decoder.reset();
      } catch {
        this.#createDecoder();
      }
    }
    const sc = startCodeLenAt(spsNal, 0);
    if (!sc || spsNal.length < sc + 4) {
      return;
    }
    const spsRbsp = spsNal.subarray(sc);
    const config = {
      codec: codecFromSps(spsRbsp),
      optimizeForLatency: true,
      hardwareAcceleration: "prefer-hardware",
    };
    try {
      this.decoder.configure(config);
    } catch {
      try {
        this.decoder.configure({
          ...config,
          hardwareAcceleration: "prefer-software",
        });
      } catch (error2) {
        this.lastError = error2?.message ?? String(error2);
      }
    }
  }

  /**
   * @param {Uint8Array} bytes whole MediaCodec Annex-B buffer
   * @param {boolean} isKey
   */
  #decodePacket(bytes, isKey) {
    this.#ensureDecoder();
    if (!this.decoder || this.decoder.state !== "configured") {
      return;
    }
    if (this.needIdr && !isKey) {
      return;
    }
    if (!this.hadIdr && !isKey) {
      return;
    }
    try {
      this.decoder.decode(
        new EncodedVideoChunk({
          type: isKey ? "key" : "delta",
          // Monotonic us timestamps (upstream uses 0; wall-clock bursts hurt pacing).
          timestamp: this.frameIndex * 16_666,
          data: bytes,
        }),
      );
      this.frameIndex += 1;
      if (isKey) {
        this.needIdr = false;
        this.hadIdr = true;
      }
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.#markNeedKeyframe(true);
    }
  }

  pushFrame(arrayBuffer) {
    if (!arrayBuffer) {
      return;
    }
    const bytes = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
    if (bytes.length < 4 || !startCodeLenAt(bytes, 0)) {
      return;
    }

    const firstType = nalTypeAt(bytes, 0);
    if (firstType === 7) {
      // First NAL is SPS — configure from it without scanning the whole IDR.
      let next = bytes.length;
      const sc = startCodeLenAt(bytes, 0) || 4;
      for (let j = sc + 1; j + 3 < bytes.length; j += 1) {
        if (startCodeLenAt(bytes, j)) {
          next = j;
          break;
        }
      }
      this.#configureFromSps(bytes.subarray(0, next));
    }

    // P-frames (type 1) are never keys — skip O(n) IDR scan on the hot path.
    const isKey =
      firstType === 5 ||
      firstType === 7 ||
      (firstType !== 1 && firstType !== 9 && packetHasIdr(bytes));
    // One MediaCodec buffer → one decode() (matches device encoder + upstream player).
    this.#decodePacket(bytes, isKey);
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
    this.onNeedKeyframe = null;
  }
}
