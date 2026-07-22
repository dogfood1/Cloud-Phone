package com.genymobile.scrcpy.ws;

import com.genymobile.scrcpy.Options;
import com.genymobile.scrcpy.model.Codec;
import com.genymobile.scrcpy.util.Ln;
import com.genymobile.scrcpy.video.VideoSink;

import android.media.MediaCodec;

import org.java_websocket.WebSocket;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Set;

public final class WsStreamer implements VideoSink {

  private final Codec codec;
  private final Set<WebSocket> clients;

  public WsStreamer(Set<WebSocket> clients, Options options) {
    this.clients = clients;
    this.codec = options.getVideoCodec();
  }

  @Override
  public Codec getCodec() {
    return codec;
  }

  @Override
  public void writeVideoHeader() {
    // ws-scrcpy clients expect raw Annex-B NAL units without scrcpy stream meta.
  }

  @Override
  public void writeSessionMeta(int width, int height, boolean isClientResize) {
    // not used for ws-scrcpy wire format
  }

  @Override
  public void writePacket(ByteBuffer buffer, MediaCodec.BufferInfo bufferInfo) throws IOException {
    if (clients.isEmpty()) {
      return;
    }

    ByteBuffer slice = buffer.slice();
    slice.limit(bufferInfo.size);
    byte[] annexB = WsAnnexB.toAnnexB(slice);
    if (annexB.length == 0) {
      return;
    }

    ByteBuffer frame = ByteBuffer.wrap(annexB);
    synchronized (clients) {
      for (WebSocket socket : clients) {
        if (socket == null || !socket.isOpen()) {
          continue;
        }
        try {
          socket.send(frame.duplicate());
        } catch (Exception e) {
          Ln.w("WebSocket send failed: " + e.getMessage());
        }
      }
    }
  }

  @Override
  public void notifyCastError(String code, String message) {
    String safeCode = code == null || code.isEmpty() ? "cast_error" : code;
    String safeMessage = message == null ? "" : message;
    String json = "{\"type\":\"cast_error\",\"code\":\"" + jsonEscape(safeCode)
        + "\",\"message\":\"" + jsonEscape(safeMessage) + "\"}";
    synchronized (clients) {
      for (WebSocket socket : clients) {
        if (socket == null || !socket.isOpen()) {
          continue;
        }
        try {
          socket.send(json);
        } catch (Exception e) {
          Ln.w("WebSocket cast_error send failed: " + e.getMessage());
        }
      }
    }
  }

  private static String jsonEscape(String value) {
    StringBuilder out = new StringBuilder(value.length() + 8);
    for (int i = 0; i < value.length(); i += 1) {
      char c = value.charAt(i);
      switch (c) {
        case '\\':
          out.append("\\\\");
          break;
        case '"':
          out.append("\\\"");
          break;
        case '\n':
          out.append("\\n");
          break;
        case '\r':
          out.append("\\r");
          break;
        case '\t':
          out.append("\\t");
          break;
        default:
          if (c < 0x20) {
            out.append(String.format("\\u%04x", (int) c));
          } else {
            out.append(c);
          }
          break;
      }
    }
    return out.toString();
  }
}
