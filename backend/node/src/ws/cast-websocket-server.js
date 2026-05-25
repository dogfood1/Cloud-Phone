import { WebSocketServer } from "ws";

import { getCastWebSocketPathname, handleCastWebSocket } from "../routes/device-cast-routes.js";

export function setupCastWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const serial = getCastWebSocketPathname(requestUrl.pathname);

    if (!serial) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      void handleCastWebSocket(ws, serial);
    });
  });

  return wss;
}
