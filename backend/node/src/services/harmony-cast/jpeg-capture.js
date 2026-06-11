import { EventEmitter } from "node:events";

import { logHarmonyCastError, logHarmonyCastInfo } from "./cast-logger.js";

const JPEG_START = Buffer.from([0xff, 0xd8]);
const JPEG_END = Buffer.from([0xff, 0xd9]);

export class HarmonyJpegCapture extends EventEmitter {
  /**
   * @param {import("./uitest-rpc.js").UitestRpcClient} rpc
   * @param {string} serial
   */
  constructor(rpc, serial) {
    super();
    this.rpc = rpc;
    this.serial = serial;
    this.active = false;
    /** @type {Buffer} */
    this.buffer = Buffer.alloc(0);
    this.onSocketData = this.onSocketData.bind(this);
  }

  async start() {
    const response = await this.rpc.invokeCaptures("startCaptureScreen", []);
    const reply = JSON.stringify(response).toLowerCase();

    if (!reply.includes("true")) {
      throw new Error("Harmony startCaptureScreen rejected.");
    }

    const socket = this.rpc.getSocket();

    if (!socket) {
      throw new Error("uitest socket missing after startCaptureScreen.");
    }

    socket.on("data", this.onSocketData);
    this.active = true;
    logHarmonyCastInfo(this.serial, "jpeg.capture.started", {});
  }

  onSocketData(chunk) {
    if (!this.active) {
      return;
    }

    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (true) {
      const start = this.buffer.indexOf(JPEG_START);
      const end = this.buffer.indexOf(JPEG_END);

      if (start < 0 || end < 0 || end <= start) {
        return;
      }

      const frame = this.buffer.subarray(start, end + 2);
      this.buffer = this.buffer.subarray(end + 2);
      this.emit("frame", frame);
    }
  }

  async stop() {
    this.active = false;
    const socket = this.rpc.getSocket();
    socket?.off("data", this.onSocketData);

    try {
      await this.rpc.invokeCaptures("stopCaptureScreen", []);
      await this.rpc.readLine(3000).catch(() => {});
    } catch (error) {
      logHarmonyCastError(this.serial, "jpeg.capture.stop_failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
    }

    this.buffer = Buffer.alloc(0);
    logHarmonyCastInfo(this.serial, "jpeg.capture.stopped", {});
  }
}
