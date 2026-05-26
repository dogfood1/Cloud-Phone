import { WebSocketServer } from "ws";

import { logCastInfo } from "../services/scrcpy-cast/cast-logger.js";
import {
  handleCastControlWebSocket,
  handleCastWebSocket,
  parseCastWebSocketPath,
} from "../routes/device-cast-routes.js";

export function setupCastWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const route = parseCastWebSocketPath(requestUrl.pathname);

    if (!route) {
      socket.destroy();
      return;
    }

    logCastInfo(route.serial, "ws.upgrade", { path: requestUrl.pathname, channel: route.channel });

    wss.handleUpgrade(request, socket, head, (ws) => {
      if (route.channel === "control") {
        void handleCastControlWebSocket(ws, route.serial);
        return;
      }

      void handleCastWebSocket(ws, route.serial);
    });
  });

  return wss;
}
