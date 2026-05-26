package com.genymobile.scrcpy.ws;

import com.genymobile.scrcpy.AsyncProcessor;
import com.genymobile.scrcpy.CleanUp;
import com.genymobile.scrcpy.Options;
import com.genymobile.scrcpy.control.ControlMessage;
import com.genymobile.scrcpy.control.Controller;
import com.genymobile.scrcpy.model.ConfigurationException;
import com.genymobile.scrcpy.util.Ln;
import com.genymobile.scrcpy.video.ScreenCapture;
import com.genymobile.scrcpy.video.SurfaceCapture;
import com.genymobile.scrcpy.video.SurfaceEncoder;

import org.java_websocket.WebSocket;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

public final class WsCastSession implements WsSocketBroadcaster {

  private final Options baseOptions;
  private final WsServer server;
  private VideoSettings videoSettings;
  private final Set<WebSocket> clients = Collections.synchronizedSet(new HashSet<>());

  private WsControlChannel controlChannel;
  private Controller controller;
  private SurfaceEncoder surfaceEncoder;
  private SurfaceCapture surfaceCapture;
  private WsStreamer streamer;
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
      restartPipeline();
      return;
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

    if (streamOptions.getCleanup()) {
      cleanUp = CleanUp.start(streamOptions);
    }

    controlChannel = new WsControlChannel(this);
    controller = new Controller(controlChannel, cleanUp, streamOptions);
    surfaceCapture = new ScreenCapture(controller, streamOptions);
    streamer = new WsStreamer(clients, streamOptions);
    surfaceEncoder = new SurfaceEncoder(surfaceCapture, streamer, streamOptions);
    controller.setSurfaceCapture(surfaceCapture);

  AsyncProcessor.TerminationListener listener = fatalError -> {
      if (fatalError) {
        Ln.e("Web cast processor stopped on error");
      }
    };

    surfaceEncoder.start(listener);
    controller.start(listener);
    started = true;
    server.broadcastInitialInfo();
  }

  private void restartPipeline() throws IOException, ConfigurationException {
    startPipeline();
  }

  private void stopPipeline() {
    started = false;
    if (surfaceEncoder != null) {
      surfaceEncoder.stop();
      surfaceEncoder = null;
    }
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
