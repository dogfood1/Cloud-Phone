import { WebSocketServer } from "ws";

import {
  handleCastControlWebSocket,
  handleCastWebSocket,
  parseCastWebSocketPath,
} from "../routes/device-cast-routes.js";
import {
  handleDeviceTerminalWebSocket,
  parseTerminalWebSocketPath,
} from "../routes/device-terminal-routes.js";
import { verifyWebSocketSession } from "../middleware/ws-auth.js";
import { logCastInfo } from "../services/scrcpy-cast/cast-logger.js";

export function setupDeviceWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (request, socket, head) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const castRoute = parseCastWebSocketPath(requestUrl.pathname);
    const terminalRoute = parseTerminalWebSocketPath(requestUrl.pathname);

    if (!castRoute && !terminalRoute) {
      socket.destroy();
      return;
    }

    const authorized = await verifyWebSocketSession(request);

    if (!authorized) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const serial = castRoute?.serial ?? terminalRoute?.serial;
    const channel = castRoute?.channel ?? "terminal";

    logCastInfo(serial, "ws.upgrade", { path: requestUrl.pathname, channel });

    wss.handleUpgrade(request, socket, head, (ws) => {
      if (terminalRoute) {
        handleDeviceTerminalWebSocket(ws, terminalRoute.serial);
        return;
      }

      if (castRoute.channel === "control") {
        void handleCastControlWebSocket(ws, castRoute.serial);
        return;
      }

      void handleCastWebSocket(ws, castRoute.serial);
    });
  });

  return wss;
}
