import { logCastError } from "./cast-logger.js";
import {
  SCRCPY_CODEC_H264,
  SCRCPY_PACKET_HEADER_SIZE,
  isSessionHeader,
  parsePacketHeader,
  parseSessionHeader,
} from "./scrcpy-packet-constants.js";

/**
 * scrcpy app/src/demuxer.c — codec id, session, then 12-byte headers + payloads.
 */
export class ScrcpyVideoDemuxer {
  /**
   * @param {object} handlers
   * @param {(codecId: number) => void} handlers.onCodecId
   * @param {(session: { width: number, height: number, clientResized: boolean }) => void} handlers.onSession
   * @param {(packet: Buffer) => void} handlers.onConfig
   * @param {(packet: Buffer, meta: { pts: bigint, key: boolean }) => void} handlers.onMedia
   * @param {(message: string) => void} [handlers.onError]
   */
  /**
   * @param {object} handlers
   * @param {{ skipInitialDummy?: boolean }} [options]
   */
  constructor(handlers, options = {}) {
    this.handlers = handlers;
    this.skipInitialDummy = options.skipInitialDummy === true;
    /** @type {Buffer} */
    this.buffer = Buffer.alloc(0);
    /** @type {'dummy' | 'codec' | 'header' | 'body'} */
    this.phase = this.skipInitialDummy ? "codec" : "dummy";
    this.expectSession = true;
    /** @type {{ packetSize: number, pts: bigint, key: boolean, isConfig: boolean } | null} */
    this.pendingPacket = null;
    this.codecReady = false;
  }

  reset() {
    this.buffer = Buffer.alloc(0);
    this.phase = this.skipInitialDummy ? "codec" : "dummy";
    this.expectSession = true;
    this.pendingPacket = null;
    this.codecReady = false;
  }

  /**
   * @param {Buffer} chunk
   */
  push(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.#drain()) {
      // loop
    }
  }

  #fail(message) {
    this.handlers.onError?.(message);
    logCastError("demuxer", "parse.failed", { message });
    throw new Error(message);
  }

  #drain() {
    if (this.phase === "dummy") {
      if (this.buffer.length < 1) {
        return false;
      }

      this.buffer = this.buffer.subarray(1);
      this.phase = "codec";
    }

    if (this.phase === "codec") {
      if (this.buffer.length < 4) {
        return false;
      }

      const codecId = this.buffer.readUInt32BE(0);
      this.buffer = this.buffer.subarray(4);
      this.codecReady = true;
      this.handlers.onCodecId(codecId);

      if (codecId === 0) {
        this.#fail("Device disabled video stream.");
      }

      if (codecId === 1) {
        this.#fail("Device reported video configuration error.");
      }

      if (codecId !== SCRCPY_CODEC_H264) {
        this.#fail(`Unsupported scrcpy codec id: 0x${codecId.toString(16)}`);
      }

      this.phase = "header";
      return true;
    }

    if (this.phase === "header") {
      if (this.buffer.length < SCRCPY_PACKET_HEADER_SIZE) {
        return false;
      }

      const header = this.buffer.subarray(0, SCRCPY_PACKET_HEADER_SIZE);
      this.buffer = this.buffer.subarray(SCRCPY_PACKET_HEADER_SIZE);

      if (isSessionHeader(header)) {
        this.expectSession = false;
        this.handlers.onSession(parseSessionHeader(header));
        return true;
      }

      if (this.expectSession) {
        this.#fail("Expected scrcpy session header before media packets.");
      }

      const parsed = parsePacketHeader(header);

      if (parsed.packetSize === 0) {
        this.#fail("Invalid scrcpy packet length: 0");
      }

      this.pendingPacket = {
        packetSize: parsed.packetSize,
        pts: parsed.pts,
        key: parsed.isKeyFrame,
        isConfig: parsed.isConfig,
      };
      this.phase = "body";
      return true;
    }

    if (this.phase === "body" && this.pendingPacket) {
      const { packetSize, pts, key, isConfig } = this.pendingPacket;

      if (this.buffer.length < packetSize) {
        return false;
      }

      const body = this.buffer.subarray(0, packetSize);
      this.buffer = this.buffer.subarray(packetSize);
      this.pendingPacket = null;
      this.phase = "header";

      if (isConfig) {
        this.handlers.onConfig(body);
      } else {
        this.handlers.onMedia(body, { pts, key });
      }

      return true;
    }

    return false;
  }
}
