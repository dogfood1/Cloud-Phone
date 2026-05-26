package com.genymobile.scrcpy.ws;

import com.genymobile.scrcpy.AndroidVersions;
import com.genymobile.scrcpy.AsyncProcessor;
import com.genymobile.scrcpy.Options;
import com.genymobile.scrcpy.audio.AudioCapture;
import com.genymobile.scrcpy.audio.AudioCaptureException;
import com.genymobile.scrcpy.audio.AudioConfig;
import com.genymobile.scrcpy.audio.AudioDirectCapture;
import com.genymobile.scrcpy.audio.AudioPlaybackCapture;
import com.genymobile.scrcpy.util.IO;
import com.genymobile.scrcpy.util.Ln;

import android.media.MediaCodec;
import android.os.Build;

import org.java_websocket.WebSocket;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Set;

/** Captures device PCM and forwards it over WebSocket (audio-only web cast). */
public final class WsPcmAudioProcessor implements AsyncProcessor {

  private final Set<WebSocket> clients;
  private final Options options;
  private Thread thread;

  public WsPcmAudioProcessor(Set<WebSocket> clients, Options options) {
    this.clients = clients;
    this.options = options;
  }

  private void record() throws IOException, AudioCaptureException {
    if (Build.VERSION.SDK_INT < AndroidVersions.API_30_ANDROID_11) {
      Ln.w("Audio-only web cast requires Android 11+");
      return;
    }

    AudioCapture capture;
    if (options.getAudioSource().isDirect()) {
      capture = new AudioDirectCapture(options.getAudioSource());
    } else {
      capture = new AudioPlaybackCapture(options.getAudioDup());
    }

    ByteBuffer buffer = ByteBuffer.allocateDirect(AudioConfig.MAX_READ_SIZE);
    MediaCodec.BufferInfo bufferInfo = new MediaCodec.BufferInfo();

    try {
      capture.start();
    } catch (Throwable t) {
      Ln.e("Could not start audio capture for web cast", t);
      return;
    }

    try {
      while (!Thread.currentThread().isInterrupted()) {
        buffer.clear();
        int read = capture.read(buffer, bufferInfo);
        if (read < 0) {
          throw new IOException("Could not read audio: " + read);
        }
        buffer.limit(read);
        WsPcmSender.sendPcm(clients, buffer);
      }
    } catch (IOException e) {
      if (!IO.isBrokenPipe(e)) {
        Ln.e("Web cast audio capture error", e);
      }
    } finally {
      capture.stop();
    }
  }

  @Override
  public void start(TerminationListener listener) {
    thread = new Thread(() -> {
      boolean fatal = false;
      try {
        record();
      } catch (AudioCaptureException e) {
        // logged by capture layer
      } catch (Throwable t) {
        Ln.e("Web cast audio processor error", t);
        fatal = true;
      } finally {
        listener.onTerminated(fatal);
      }
    }, "ws-pcm-audio");
    thread.start();
  }

  @Override
  public void stop() {
    if (thread != null) {
      thread.interrupt();
    }
  }

  @Override
  public void join() throws InterruptedException {
    if (thread != null) {
      thread.join();
    }
  }
}
