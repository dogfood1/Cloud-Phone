import { WebSocketServer } from "ws";

import {
  handleCastControlWebSocket,
  handleCastWebSocket,
  parseCastWebSocketPath,
} from "../routes/device-cast-ws.js";
import {
  handleDeviceTerminalWebSocket,
  parseTerminalWebSocketPath,
} from "../routes/device-terminal-routes.js";
import { verifyWebSocketSession } from "../middleware/ws-auth.js";
import { logCastInfo, logCastWarn } from "../services/scrcpy-cast/cast-logger.js";

export function setupDeviceWebSocket(server) {
  const wss = new WebSocketServer({
    noServer: true,
    // H.264 is already compressed; deflate adds CPU and latency on the hot path.
    perMessageDeflate: false,
  });

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
      const serial = castRoute?.serial ?? terminalRoute?.serial;
      logCastWarn(serial ?? "unknown", "ws.rejected", {
        reason: "unauthorized",
        path: requestUrl.pathname,
      });
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

      // Buffer client frames IMMEDIATELY — browser may send type 101 on open
      // before async handleCastWebSocket attaches its own listener.
      const earlyClientMessages = [];
      const onEarlyMessage = (data) => {
        earlyClientMessages.push(data);
      };
      ws.on("message", onEarlyMessage);

      void handleCastWebSocket(ws, castRoute.serial, {
        earlyClientMessages,
        detachEarlyMessage: () => ws.off("message", onEarlyMessage),
        sessionKey: requestUrl.searchParams.get("sessionKey") || castRoute.serial,
      });
    });
  });

  return wss;
}
