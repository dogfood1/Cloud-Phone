package com.genymobile.scrcpy.ws;

import com.genymobile.scrcpy.Options;
import com.genymobile.scrcpy.Workarounds;
import com.genymobile.scrcpy.model.ConfigurationException;
import com.genymobile.scrcpy.util.Ln;

import android.os.Looper;

import java.io.IOException;

public final class WebSocketServerRunner {

  private WebSocketServerRunner() {
  }

  public static void run(Options options) throws IOException, ConfigurationException {
    Workarounds.apply();
    WsServer server = new WsServer(options);
    server.setReuseAddr(true);
    server.start();
    Ln.i("Cloud Phone WebSocket scrcpy mode on port " + options.getWsPort());
    Looper.loop();
  }
}
