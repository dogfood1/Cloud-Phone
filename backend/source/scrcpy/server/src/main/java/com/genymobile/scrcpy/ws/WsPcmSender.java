package com.genymobile.scrcpy.ws;

import com.genymobile.scrcpy.util.Ln;

import org.java_websocket.WebSocket;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Set;

/** Sends raw PCM (s16le stereo 48kHz) with {@code scrcpy_audio} magic prefix. */
public final class WsPcmSender {

  static final byte[] MAGIC_AUDIO = "scrcpy_audio".getBytes(StandardCharsets.UTF_8);

  private WsPcmSender() {
  }

  static void sendPcm(Set<WebSocket> clients, ByteBuffer pcm) {
    if (clients.isEmpty() || pcm == null || !pcm.hasRemaining()) {
      return;
    }

    int pcmSize = pcm.remaining();
    byte[] frame = new byte[MAGIC_AUDIO.length + pcmSize];
    System.arraycopy(MAGIC_AUDIO, 0, frame, 0, MAGIC_AUDIO.length);
    pcm.get(frame, MAGIC_AUDIO.length, pcmSize);

    ByteBuffer wrapped = ByteBuffer.wrap(frame);
    synchronized (clients) {
      for (WebSocket socket : clients) {
        if (socket == null || !socket.isOpen()) {
          continue;
        }
        try {
          socket.send(wrapped.duplicate());
        } catch (Exception e) {
          Ln.w("WebSocket audio send failed: " + e.getMessage());
        }
      }
    }
  }
}
