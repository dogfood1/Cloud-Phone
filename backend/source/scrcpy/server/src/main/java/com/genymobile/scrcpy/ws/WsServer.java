package com.genymobile.scrcpy.ws;

import com.genymobile.scrcpy.Options;
import com.genymobile.scrcpy.model.ConfigurationException;
import com.genymobile.scrcpy.util.Ln;

import org.java_websocket.WebSocket;
import org.java_websocket.framing.CloseFrame;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

import java.net.InetSocketAddress;
import java.nio.ByteBuffer;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

public final class WsServer extends WebSocketServer {

  private static final class ClientInfo {
    final int clientId;
    WsCastSession session;

    ClientInfo(int clientId) {
      this.clientId = clientId;
    }
  }

  private final Options options;
  private final VideoSettings defaultVideoSettings;
  private final Map<Integer, WsCastSession> sessionsByDisplay = new HashMap<>();
  private final AtomicInteger nextClientId = new AtomicInteger();
  private ByteBuffer initialInfoTemplate;

  public WsServer(Options options) {
    super(new InetSocketAddress(
        options.getWsListenAll() ? "0.0.0.0" : "127.0.0.1",
        options.getWsPort()));
    this.options = options;
    this.defaultVideoSettings = VideoSettings.fromOptions(options);
    setConnectionLostTimeout(100);
  }

  @Override
  public void onOpen(WebSocket webSocket, ClientHandshake handshake) {
    int clientId = nextClientId.incrementAndGet();
    ClientInfo info = new ClientInfo(clientId);
    webSocket.setAttachment(info);
    try {
      joinDefaultStream(webSocket, info);
      sendInitialTo(webSocket, clientId);
    } catch (Exception e) {
      Ln.e("WebSocket client setup failed", e);
      webSocket.close(CloseFrame.ABNORMAL_CLOSE, "setup failed");
    }
  }

  @Override
  public void onClose(WebSocket webSocket, int code, String reason, boolean remote) {
    ClientInfo info = webSocket.getAttachment();
    if (info != null && info.session != null) {
      info.session.leave(webSocket);
    }
  }

  @Override
  public void onMessage(WebSocket webSocket, String message) {
    Ln.d("Ignored text ws message: " + message);
  }

  @Override
  public void onMessage(WebSocket webSocket, ByteBuffer bytes) {
    ClientInfo info = webSocket.getAttachment();
    if (info == null) {
      return;
    }
    try {
      if (info.session == null) {
        joinDefaultStream(webSocket, info);
      }
      info.session.handleControl(bytes.duplicate());
    } catch (Exception e) {
      Ln.e("WebSocket control error", e);
    }
  }

  @Override
  public void onError(WebSocket webSocket, Exception ex) {
    Ln.e("WebSocket error", ex);
  }

  @Override
  public void onStart() {
    Ln.i("WebSocket scrcpy server listening on " + getAddress());
  }

  void broadcastInitialInfo() {
    initialInfoTemplate = WsInitialInfo.build(sessionsByDisplay);
    for (WebSocket socket : getConnections()) {
      ClientInfo info = socket.getAttachment();
      if (info != null) {
        sendInitialTo(socket, info.clientId);
      }
    }
  }

  private void sendInitialTo(WebSocket socket, int clientId) {
    if (initialInfoTemplate == null) {
      initialInfoTemplate = WsInitialInfo.build(sessionsByDisplay);
    }
    ByteBuffer copy = initialInfoTemplate.duplicate();
    copy.position(copy.capacity() - 4);
    copy.putInt(clientId);
    copy.rewind();
    socket.send(copy);
  }

  private void joinDefaultStream(WebSocket webSocket, ClientInfo info) throws Exception {
    int displayId = defaultVideoSettings.getDisplayId();
    WsCastSession session = sessionsByDisplay.get(displayId);
    if (session == null) {
      session = new WsCastSession(options, defaultVideoSettings, this);
      sessionsByDisplay.put(displayId, session);
    }
    info.session = session;
    session.join(webSocket, null);
  }
}
