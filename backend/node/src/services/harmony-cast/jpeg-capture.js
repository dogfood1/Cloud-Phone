import { EventEmitter } from "node:events";

import { buildCaptureScreenArgs } from "./cast-options.js";
import { logHarmonyCastError, logHarmonyCastInfo } from "./cast-logger.js";

const JPEG_START = Buffer.from([0xff, 0xd8]);
const JPEG_END = Buffer.from([0xff, 0xd9]);

function extractJpegFrames(buffer) {
  /** @type {Buffer[]} */
  const frames = [];
  let pending = buffer;

  while (true) {
    const start = pending.indexOf(JPEG_START);
    const end = pending.indexOf(JPEG_END);

    if (start < 0 || end < 0 || end <= start) {
      return { frames, rest: pending };
    }

    frames.push(pending.subarray(start, end + 2));
    pending = pending.subarray(end + 2);
  }
}

export class HarmonyJpegCapture extends EventEmitter {
  /**
   * @param {import("./uitest-rpc.js").UitestRpcClient} rpc
   * @param {string} serial
   * @param {{ scale?: number, quality?: number }} [captureOptions]
   */
  constructor(rpc, serial, captureOptions = {}) {
    super();
    this.rpc = rpc;
    this.serial = serial;
    this.captureOptions = captureOptions;
    this.active = false;
    this.captureSessionId = 0;
    /** @type {Buffer} */
    this.buffer = Buffer.alloc(0);
    this.onCaptureFrame = this.onCaptureFrame.bind(this);
  }

  async start() {
    if (this.active) {
      await this.stop();
    }

    try {
      await this.rpc.invokeCaptures("stopCaptureScreen", {});
    } catch {
      // ECHO/hdckit always stops an existing capture before starting again.
    }

    const captureArgs = buildCaptureScreenArgs(this.captureOptions);
    const response = await this.rpc.invokeCaptures("startCaptureScreen", captureArgs);
    this.captureSessionId = Number(response.sessionId);

    if (!this.captureSessionId) {
      throw new Error("uitest capture session id is missing.");
    }

    this.rpc.watchCaptureSession(this.captureSessionId, this.onCaptureFrame);
    this.active = true;
    logHarmonyCastInfo(this.serial, "jpeg.capture.started", {
      ...this.captureOptions,
      sessionId: this.captureSessionId,
    });
  }

  onCaptureFrame(body) {
    if (!this.active) {
      return;
    }

    this.buffer = Buffer.concat([this.buffer, body]);
    const { frames, rest } = extractJpegFrames(this.buffer);
    this.buffer = rest;

    for (const frame of frames) {
      this.emit("frame", frame);
    }
  }

  async stop() {
    this.active = false;

    if (this.captureSessionId) {
      this.rpc.unwatchCaptureSession(this.captureSessionId, this.onCaptureFrame);
    }

    try {
      await this.rpc.invokeCaptures("stopCaptureScreen", {});
    } catch (error) {
      logHarmonyCastError(this.serial, "jpeg.capture.stop_failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
    }

    this.captureSessionId = 0;
    this.buffer = Buffer.alloc(0);
    logHarmonyCastInfo(this.serial, "jpeg.capture.stopped", {});
  }
}
