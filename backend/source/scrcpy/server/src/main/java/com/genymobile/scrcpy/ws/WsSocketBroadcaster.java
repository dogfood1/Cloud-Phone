package com.genymobile.scrcpy.ws;

import org.java_websocket.WebSocket;

import java.nio.ByteBuffer;
import java.util.Set;

public interface WsSocketBroadcaster {

  Set<WebSocket> getOpenSockets();

  void broadcast(ByteBuffer data);
}
