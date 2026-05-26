package com.genymobile.scrcpy.ws;

import com.genymobile.scrcpy.control.ControlMessage;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;

/** Drops non-control WebSocket payloads before they reach scrcpy ControlMessageReader. */
final class WsControlFilter {

  static final int TYPE_PUSH_FILE = 102;

  private static final byte[] MAGIC_INITIAL = "scrcpy_initial".getBytes(StandardCharsets.UTF_8);
  private static final byte[] MAGIC_MESSAGE = "scrcpy_message".getBytes(StandardCharsets.UTF_8);

  private WsControlFilter() {
  }

  static boolean shouldFeedToControl(ByteBuffer payload) {
    if (payload == null || !payload.hasRemaining()) {
      return false;
    }
    if (startsWith(payload, MAGIC_INITIAL) || startsWith(payload, MAGIC_MESSAGE)) {
      return false;
    }
    if (looksLikeAnnexB(payload)) {
      return false;
    }
    int type = payload.get(payload.position()) & 0xff;
    if (type == VideoSettings.TYPE_CHANGE_STREAM_PARAMETERS || type == TYPE_PUSH_FILE) {
      return false;
    }
    return isSupportedScrcpyControlType(type);
  }

  private static boolean isSupportedScrcpyControlType(int type) {
    return type >= ControlMessage.TYPE_INJECT_KEYCODE && type <= ControlMessage.TYPE_RESIZE_DISPLAY;
  }

  private static boolean looksLikeAnnexB(ByteBuffer buffer) {
    if (buffer.remaining() < 3) {
      return false;
    }
    int pos = buffer.position();
    byte b0 = buffer.get(pos);
    byte b1 = buffer.get(pos + 1);
    if (b0 != 0 || b1 != 0) {
      return false;
    }
    byte b2 = buffer.get(pos + 2);
    if (b2 == 1) {
      return true;
    }
    return buffer.remaining() >= 4 && b2 == 0 && buffer.get(pos + 3) == 1;
  }

  private static boolean startsWith(ByteBuffer buffer, byte[] magic) {
    if (buffer.remaining() < magic.length) {
      return false;
    }
    int pos = buffer.position();
    for (int i = 0; i < magic.length; i++) {
      if (buffer.get(pos + i) != magic[i]) {
        return false;
      }
    }
    return true;
  }
}
