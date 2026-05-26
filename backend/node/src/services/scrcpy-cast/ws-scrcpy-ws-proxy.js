import WS from "ws";

/**
 * Proxy a browser WebSocket to a device WebSocket endpoint.
 * @param {import("ws").WebSocket} clientWs
 * @param {string} remoteUrl
 */
export function proxyWebSocket(clientWs, remoteUrl) {
  const remoteWs = new WS(remoteUrl);

  const closeBoth = (code = 1000, reason = "") => {
    try {
      if (clientWs.readyState === clientWs.OPEN) {
        clientWs.close(code, reason);
      }
    } catch {
      // ignore
    }
    try {
      if (remoteWs.readyState === remoteWs.OPEN) {
        remoteWs.close(code, reason);
      }
    } catch {
      // ignore
    }
  };

  remoteWs.on("open", () => {
    // flush nothing; proxy immediately
  });

  remoteWs.on("message", (data) => {
    if (clientWs.readyState === clientWs.OPEN) {
      clientWs.send(data);
    }
  });

  remoteWs.on("close", () => closeBoth(1000, "device ws closed"));
  remoteWs.on("error", (err) => closeBoth(1011, err?.message ?? "device ws error"));

  clientWs.on("message", (data) => {
    if (remoteWs.readyState === remoteWs.OPEN) {
      remoteWs.send(data);
    }
  });

  clientWs.on("close", () => closeBoth(1000, "client ws closed"));
  clientWs.on("error", () => closeBoth(1011, "client ws error"));

  return remoteWs;
}

