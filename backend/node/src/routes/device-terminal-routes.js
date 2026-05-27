import { attachTerminalWebSocket } from "../services/device-terminal/shell-bridge.js";

/**
 * @param {string} pathname
 * @returns {{ serial: string } | null}
 */
export function parseTerminalWebSocketPath(pathname) {
  const match = pathname.match(/^\/api\/devices\/([^/]+)\/terminal\/ws$/);

  if (!match) {
    return null;
  }

  return { serial: decodeURIComponent(match[1]) };
}

/**
 * @param {import("ws").WebSocket} ws
 * @param {string} serial
 */
export function handleDeviceTerminalWebSocket(ws, serial) {
  if (!serial) {
    ws.close(1008, "invalid serial");
    return;
  }

  attachTerminalWebSocket(ws, serial);
}
