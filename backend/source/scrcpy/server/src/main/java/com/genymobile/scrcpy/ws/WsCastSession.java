package com.genymobile.scrcpy.ws;

import com.genymobile.scrcpy.AsyncProcessor;
import com.genymobile.scrcpy.CleanUp;
import com.genymobile.scrcpy.Options;
import com.genymobile.scrcpy.control.ControlMessage;
import com.genymobile.scrcpy.control.Controller;
import com.genymobile.scrcpy.model.ConfigurationException;
import com.genymobile.scrcpy.util.Ln;
import com.genymobile.scrcpy.util.Settings;
import com.genymobile.scrcpy.util.SettingsException;
import com.genymobile.scrcpy.video.ScreenCapture;
import com.genymobile.scrcpy.video.SurfaceCapture;
import com.genymobile.scrcpy.video.SurfaceEncoder;

import org.java_websocket.WebSocket;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public final class WsCastSession implements WsSocketBroadcaster {

  private static final ScheduledExecutorService SCHEDULER = Executors.newSingleThreadScheduledExecutor();

  private final Options baseOptions;
  private final WsServer server;
  private VideoSettings videoSettings;
  private final Set<WebSocket> clients = Collections.synchronizedSet(new HashSet<>());

  private WsControlChannel controlChannel;
  private Controller controller;
  private SurfaceEncoder surfaceEncoder;
  private SurfaceCapture surfaceCapture;
  private WsStreamer streamer;
  private WsPcmAudioProcessor pcmAudioProcessor;
  private CleanUp cleanUp;
  private boolean started;

  WsCastSession(Options baseOptions, VideoSettings videoSettings, WsServer server) {
    this.baseOptions = baseOptions;
    this.videoSettings = videoSettings;
    this.server = server;
  }

  VideoSettings getVideoSettings() {
    return videoSettings;
  }

  int getClientCount() {
    return clients.size();
  }

  byte[] getScreenInfoBytes() {
    return new byte[0];
  }

  @Override
  public Set<WebSocket> getOpenSockets() {
    return clients;
  }

  @Override
  public void broadcast(ByteBuffer data) {
    synchronized (clients) {
      for (WebSocket socket : clients) {
        if (socket != null && socket.isOpen()) {
          socket.send(data.duplicate());
        }
      }
    }
  }

  void join(WebSocket socket, VideoSettings incoming) throws IOException, ConfigurationException {
    if (socket != null) {
      clients.add(socket);
    }
    if (incoming != null && !incoming.equals(videoSettings)) {
      videoSettings = incoming;
      if (started) {
        softReconfigureStream();
        server.broadcastInitialInfo();
        return;
      }
    }
    if (!started) {
      startPipeline();
    } else {
      server.broadcastInitialInfo();
    }
  }

  void leave(WebSocket socket) {
    clients.remove(socket);
    if (clients.isEmpty()) {
      stopPipeline();
    } else {
      server.broadcastInitialInfo();
    }
  }

  void handleControl(ByteBuffer payload) throws IOException, ConfigurationException {
    if (!payload.hasRemaining()) {
      return;
    }
    int type = payload.get(payload.position()) & 0xff;
    if (type == VideoSettings.TYPE_CHANGE_STREAM_PARAMETERS) {
      payload.get(); // consume type
      byte[] bytes = new byte[payload.remaining()];
      payload.get(bytes);
      join(null, VideoSettings.fromByteArray(bytes));
      return;
    }
    if (type == WsControlFilter.TYPE_PUSH_FILE) {
      // ws-scrcpy file push — not implemented on Cloud-Phone yet.
      return;
    }
    if (!WsControlFilter.shouldFeedToControl(payload)) {
      if (type > ControlMessage.TYPE_RESIZE_DISPLAY && type != WsControlFilter.TYPE_PUSH_FILE) {
        Ln.w("Ignoring unknown WebSocket control type: " + type);
      }
      return;
    }

    if (!started || controlChannel == null) {
      return;
    }

    controlChannel.feedControl(payload);
  }

  private void startPipeline() throws IOException, ConfigurationException {
    stopPipeline();
    Options streamOptions = baseOptions.copyForWebStream(videoSettings);
    boolean useVideo = streamOptions.getVideo();
    boolean useAudio = streamOptions.getAudio();

    if (streamOptions.getCleanup()) {
      cleanUp = CleanUp.start(streamOptions);
    }

    controlChannel = new WsControlChannel(this);
    controller = new Controller(controlChannel, cleanUp, streamOptions);

    applyShowTouchesSystemSetting(streamOptions.getShowTouches());

    if (useVideo) {
      surfaceCapture = new ScreenCapture(controller, streamOptions);
      streamer = new WsStreamer(clients, streamOptions);
      surfaceEncoder = new SurfaceEncoder(surfaceCapture, streamer, streamOptions);
      controller.setSurfaceCapture(surfaceCapture);
      surfaceEncoder.start(videoTerminationListener());
    }

    controller.start(controlTerminationListener());

    if (useAudio) {
      scheduleAudioProcessorStart(streamOptions, useVideo);
    } else if (!useVideo) {
      Ln.w("Web cast started with neither video nor audio");
    }

    scheduleTurnScreenOffIfRequested(streamOptions);
    started = true;
    server.broadcastInitialInfo();
  }

  private void softReconfigureStream() throws IOException, ConfigurationException {
    Options streamOptions = baseOptions.copyForWebStream(videoSettings);
    applyShowTouchesSystemSetting(streamOptions.getShowTouches());
    syncAudioProcessor(streamOptions, streamOptions.getVideo());
    if (streamOptions.getVideo() && controller != null) {
      controller.requestResetVideo();
    }
    scheduleTurnScreenOffIfRequested(streamOptions);
  }

  private AsyncProcessor.TerminationListener videoTerminationListener() {
    return fatalError -> {
      if (fatalError) {
        Ln.e("Web cast video encoder stopped on error");
      }
    };
  }

  private AsyncProcessor.TerminationListener controlTerminationListener() {
    return fatalError -> {
      if (fatalError) {
        Ln.d("Web cast control channel closed");
      }
    };
  }

  private AsyncProcessor.TerminationListener audioTerminationListener() {
    return fatalError -> {
      if (fatalError) {
        Ln.w("Web cast audio processor stopped");
      }
    };
  }

  private void scheduleAudioProcessorStart(Options streamOptions, boolean withVideo) {
    Runnable start = () -> {
      if (!started) {
        return;
      }
      stopAudioProcessor();
      pcmAudioProcessor = new WsPcmAudioProcessor(clients, streamOptions);
      pcmAudioProcessor.start(audioTerminationListener());
      if (withVideo) {
        Ln.i("Web cast video + audio (PCM over WebSocket, audio_dup=" + streamOptions.getAudioDup() + ")");
      } else {
        Ln.i("Web cast audio-only mode (PCM over WebSocket)");
      }
    };

    if (withVideo) {
      SCHEDULER.schedule(start, 350, TimeUnit.MILLISECONDS);
    } else {
      start.run();
    }
  }

  private void syncAudioProcessor(Options streamOptions, boolean withVideo) {
    if (streamOptions.getAudio()) {
      scheduleAudioProcessorStart(streamOptions, withVideo);
    } else {
      stopAudioProcessor();
    }
  }

  private void stopAudioProcessor() {
    if (pcmAudioProcessor != null) {
      pcmAudioProcessor.stop();
      pcmAudioProcessor = null;
    }
  }

  private static void applyShowTouchesSystemSetting(boolean enabled) {
    try {
      Settings.putValue(Settings.TABLE_SYSTEM, "show_touches", enabled ? "1" : "0");
    } catch (SettingsException e) {
      Ln.w("Could not set show_touches=" + enabled + ": " + e.getMessage());
    }
  }

  private void scheduleTurnScreenOffIfRequested(Options streamOptions) {
    if (!streamOptions.getTurnScreenOff() || controlChannel == null) {
      return;
    }

    SCHEDULER.schedule(() -> {
      try {
        byte[] msg = new byte[] { (byte) ControlMessage.TYPE_SET_DISPLAY_POWER, 0 };
        controlChannel.feedControl(ByteBuffer.wrap(msg));
      } catch (IOException e) {
        Ln.w("Could not request turn_screen_off: " + e.getMessage());
      }
    }, 250, TimeUnit.MILLISECONDS);
  }

  private void stopPipeline() {
    started = false;
    if (surfaceEncoder != null) {
      surfaceEncoder.stop();
      surfaceEncoder = null;
    }
    stopAudioProcessor();
    if (controller != null) {
      controller.stop();
      controller = null;
    }
    if (cleanUp != null) {
      cleanUp.interrupt();
      cleanUp = null;
    }
    controlChannel = null;
    surfaceCapture = null;
    streamer = null;
  }
}
