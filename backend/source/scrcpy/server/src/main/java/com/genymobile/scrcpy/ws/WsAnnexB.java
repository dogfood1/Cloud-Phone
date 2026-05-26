package com.genymobile.scrcpy.ws;

import java.nio.ByteBuffer;

final class WsAnnexB {

  private static final byte[] START_CODE = {0, 0, 0, 1};

  private WsAnnexB() {
  }

  static boolean hasAnnexBStartCode(ByteBuffer buffer) {
    if (buffer.remaining() < 4) {
      return false;
    }
    int pos = buffer.position();
    byte b0 = buffer.get(pos);
    byte b1 = buffer.get(pos + 1);
    byte b2 = buffer.get(pos + 2);
    byte b3 = buffer.get(pos + 3);
    return b0 == 0 && b1 == 0 && ((b2 == 1) || (b2 == 0 && b3 == 1));
  }

  static byte[] toAnnexB(ByteBuffer avcc) {
    if (hasAnnexBStartCode(avcc)) {
      byte[] raw = new byte[avcc.remaining()];
      avcc.get(raw);
      return raw;
    }

    ByteBuffer dup = avcc.duplicate();
    int total = 0;
    while (dup.remaining() >= 4) {
      int length = dup.getInt();
      if (length <= 0 || length > dup.remaining()) {
        break;
      }
      total += 4 + length;
      dup.position(dup.position() + length);
    }

    if (total == 0) {
      byte[] raw = new byte[avcc.remaining()];
      avcc.get(raw);
      return raw;
    }

    dup = avcc.duplicate();
    byte[] out = new byte[total];
    int offset = 0;
    while (dup.remaining() >= 4) {
      int length = dup.getInt();
      if (length <= 0 || length > dup.remaining()) {
        break;
      }
      System.arraycopy(START_CODE, 0, out, offset, START_CODE.length);
      offset += START_CODE.length;
      dup.get(out, offset, length);
      offset += length;
    }
    return out;
  }
}
