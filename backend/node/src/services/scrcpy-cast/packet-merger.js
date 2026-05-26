/**
 * Mirrors scrcpy app/src/packet_merger.c — prepend config (SPS/PPS) to next media packet.
 */
export class ScrcpyPacketMerger {
  constructor() {
    /** @type {Buffer | null} */
    this.config = null;
  }

  reset() {
    this.config = null;
  }

  /**
   * @param {Buffer} packet
   * @param {boolean} isConfig
   * @returns {Buffer | null} merged media packet, or null if config-only
   */
  merge(packet, isConfig) {
    if (isConfig) {
      this.config = Buffer.from(packet);
      return null;
    }

    if (!this.config) {
      return Buffer.from(packet);
    }

    const merged = Buffer.concat([this.config, packet]);
    this.config = null;
    return merged;
  }
}
