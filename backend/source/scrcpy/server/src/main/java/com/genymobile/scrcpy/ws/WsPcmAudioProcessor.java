package com.genymobile.scrcpy.ws;

import com.genymobile.scrcpy.AndroidVersions;
import com.genymobile.scrcpy.AsyncProcessor;
import com.genymobile.scrcpy.Options;
import com.genymobile.scrcpy.audio.AudioCapture;
import com.genymobile.scrcpy.audio.AudioCaptureException;
import com.genymobile.scrcpy.audio.AudioConfig;
import com.genymobile.scrcpy.audio.AudioDirectCapture;
import com.genymobile.scrcpy.audio.AudioPlaybackCapture;
import com.genymobile.scrcpy.audio.AudioSource;
import com.genymobile.scrcpy.util.IO;
import com.genymobile.scrcpy.util.Ln;

import android.media.MediaCodec;
import android.os.Build;

import org.java_websocket.WebSocket;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Set;

/** Captures device PCM and forwards it over WebSocket (audio-only or video+audio web cast). */
public final class WsPcmAudioProcessor implements AsyncProcessor {

  private final Set<WebSocket> clients;
  private final Options options;
  private Thread thread;

  public WsPcmAudioProcessor(Set<WebSocket> clients, Options options) {
    this.clients = clients;
    this.options = options;
  }

  private static AudioCapture createAudioCapture(Options options) throws AudioCaptureException {
    AudioSource audioSource = options.getAudioSource();
    AudioCapture capture;

    if (audioSource.isDirect()) {
      capture = new AudioDirectCapture(audioSource);
    } else {
      capture = new AudioPlaybackCapture(options.getAudioDup());
    }

    capture.checkCompatibility();
    return capture;
  }

  private void record() throws IOException, AudioCaptureException {
    if (Build.VERSION.SDK_INT < AndroidVersions.API_30_ANDROID_11) {
      Ln.w("Web cast audio requires Android 11+");
      return;
    }

    if (!options.getAudio()) {
      Ln.w("Web cast audio processor started while audio=false");
      return;
    }

    AudioCapture capture = createAudioCapture(options);
    ByteBuffer buffer = ByteBuffer.allocateDirect(AudioConfig.MAX_READ_SIZE);
    MediaCodec.BufferInfo bufferInfo = new MediaCodec.BufferInfo();

    Ln.i("Starting web cast PCM capture (source=" + options.getAudioSource()
        + ", audio_dup=" + options.getAudioDup() + ")");

    try {
      capture.start();
    } catch (Throwable t) {
      Ln.e("Could not start audio capture for web cast (source=" + options.getAudioSource() + ")", t);
      return;
    }

    try {
      long packets = 0;
      while (!Thread.currentThread().isInterrupted()) {
        buffer.clear();
        int read = capture.read(buffer, bufferInfo);
        if (read < 0) {
          throw new IOException("Could not read audio: " + read);
        }
        if (read == 0) {
          Thread.sleep(5);
          continue;
        }
        buffer.limit(read);
        WsPcmSender.sendPcm(clients, buffer);
        packets += 1;
        if (packets == 1) {
          Ln.i("Web cast PCM streaming started (" + read + " bytes/packet)");
        }
      }
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
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
        Ln.e("Web cast audio capture not supported on this device");
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
