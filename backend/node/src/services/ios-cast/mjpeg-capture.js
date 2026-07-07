import { EventEmitter } from "node:events";
import net from "node:net";

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

export class WdaMjpegCapture extends EventEmitter {
  /**
   * @param {string} host
   * @param {number} port
   */
  constructor(host, port) {
    super();
    this.host = host;
    this.port = port;
    this.socket = null;
    this.active = false;
    this.headersParsed = false;
    this.buffer = Buffer.alloc(0);
  }

  connect() {
    if (this.active) {
      return;
    }

    this.socket = net.connect(this.port, this.host);
    this.active = true;

    this.socket.on("data", (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);

      if (!this.headersParsed) {
        const headerEnd = this.buffer.indexOf("\r\n\r\n");

        if (headerEnd < 0) {
          return;
        }

        this.buffer = this.buffer.subarray(headerEnd + 4);
        this.headersParsed = true;
      }

      const { frames, rest } = extractJpegFrames(this.buffer);
      this.buffer = rest;

      for (const frame of frames) {
        this.emit("frame", frame);
      }
    });

    this.socket.on("error", (error) => {
      this.emit("error", error);
    });

    this.socket.on("close", () => {
      this.active = false;
      this.emit("close");
    });

    this.socket.write("\r\n");
  }

  async stop() {
    this.active = false;

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }
}
