import http from "node:http";

function buildUpgradeResponse(statusCode, statusMessage, headers) {
  const headerLines = Object.entries(headers ?? {})
    .map(([key, value]) => {
      if (value == null) {
        return "";
      }

      const normalized = Array.isArray(value) ? value.join(", ") : String(value);
      return `${key}: ${normalized}`;
    })
    .filter(Boolean);

  return `HTTP/1.1 ${statusCode} ${statusMessage}\r\n${headerLines.join("\r\n")}\r\n\r\n`;
}

function proxyUpgradeRequest(clientReq, clientSocket, clientHead, backendOrigin, requestUrl) {
  const backendUrl = new URL(backendOrigin);
  const proxyReq = http.request({
    hostname: backendUrl.hostname,
    port: backendUrl.port || 80,
    path: `${requestUrl.pathname}${requestUrl.search}`,
    method: clientReq.method,
    headers: {
      ...clientReq.headers,
      host: backendUrl.host,
    },
  });

  const destroyBoth = () => {
    clientSocket.destroy();
    proxyReq.destroy();
  };

  proxyReq.on("error", destroyBoth);

  proxyReq.on("response", (proxyRes) => {
    proxyRes.resume();
    destroyBoth();
  });

  proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
    clientSocket.write(
      buildUpgradeResponse(proxyRes.statusCode ?? 101, proxyRes.statusMessage ?? "Switching Protocols", proxyRes.headers),
    );

    if (proxyHead?.length) {
      proxySocket.write(proxyHead);
    }

    proxySocket.pipe(clientSocket);
    clientSocket.pipe(proxySocket);

    proxySocket.on("error", () => clientSocket.destroy());
    clientSocket.on("error", () => proxySocket.destroy());
  });

  proxyReq.end(clientHead);
}

/**
 * Forward browser WebSocket upgrades (/api/*) to the Node backend.
 * @param {import("node:http").Server | import("node:https").Server} server
 * @param {{ backendOrigin: string, frontendPort: number, frontendHttps?: boolean }} options
 */
export function attachApiWebSocketProxy(server, options) {
  const { backendOrigin, frontendPort, frontendHttps = false } = options;
  const pageScheme = frontendHttps ? "https" : "http";

  server.on("upgrade", (clientReq, clientSocket, clientHead) => {
    const requestUrl = new URL(clientReq.url ?? "/", `${pageScheme}://127.0.0.1:${frontendPort}`);

    if (!requestUrl.pathname.startsWith("/api/")) {
      clientSocket.destroy();
      return;
    }

    proxyUpgradeRequest(clientReq, clientSocket, clientHead, backendOrigin, requestUrl);
  });
}
