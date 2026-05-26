/** 12-byte frame header (scrcpy demuxer.c) */
export const SCRCPY_PACKET_HEADER_SIZE = 12;

/** "h264" big-endian */
export const SCRCPY_CODEC_H264 = 0x68323634;

export const SCRCPY_PACKET_FLAG_CONFIG = 0x4000_0000_0000_0000n;
export const SCRCPY_PACKET_FLAG_KEY_FRAME = 0x2000_0000_0000_0000n;
export const SCRCPY_PACKET_PTS_MASK = SCRCPY_PACKET_FLAG_KEY_FRAME - 1n;

/** WebSocket media frame: 1 byte flags + 8 byte PTS + AVCC payload */
export const SCRCPY_WS_FRAME_HEADER_SIZE = 9;
export const SCRCPY_WS_FLAG_KEY_FRAME = 0x01;

export function isSessionHeader(header) {
  return (header[0] & 0x80) !== 0;
}

export function parsePacketHeader(header) {
  const ptsFlags = header.readBigUInt64BE(0);
  const packetSize = header.readUInt32BE(8);

  return {
    isConfig: (ptsFlags & SCRCPY_PACKET_FLAG_CONFIG) !== 0n,
    isKeyFrame: (ptsFlags & SCRCPY_PACKET_FLAG_KEY_FRAME) !== 0n,
    pts: ptsFlags & SCRCPY_PACKET_PTS_MASK,
    packetSize,
  };
}

export function parseSessionHeader(header) {
  return {
    width: header.readUInt32BE(4),
    height: header.readUInt32BE(8),
    clientResized: (header[3] & 1) !== 0,
  };
}
