import WS from "ws";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Connect to device WebSocket with retries (server may still be starting).
 * @param {string} remoteUrl
 * @param {{ attempts?: number, intervalMs?: number }} [options]
 */
async function connectRemoteWebSocket(remoteUrl, options = {}) {
  const attempts = options.attempts ?? 12;
  const intervalMs = options.intervalMs ?? 250;
  let lastError = new Error("Unable to connect device WebSocket.");

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const remoteWs = await new Promise((resolve, reject) => {
        const ws = new WS(remoteUrl);
        const timer = setTimeout(() => {
          ws.terminate();
          reject(new Error("device WebSocket open timeout"));
        }, 5_000);

        ws.once("open", () => {
          clearTimeout(timer);
          resolve(ws);
        });

        ws.once("error", (error) => {
          clearTimeout(timer);
          reject(error instanceof Error ? error : new Error(String(error)));
        });
      });

      return remoteWs;
    } catch (error) {
      lastError = error instanceof Error ? error : lastError;
      if (attempt < attempts) {
        await delay(intervalMs);
      }
    }
  }

  throw lastError;
}

/**
 * Proxy a browser WebSocket to a device WebSocket endpoint.
 * @param {import("ws").WebSocket} clientWs
 * @param {string} remoteUrl
 * @param {{ prefetchedClientMessages?: unknown[] }} [options]
 */
export async function proxyWebSocket(clientWs, remoteUrl, options = {}) {
  const clientQueue = [...(options.prefetchedClientMessages ?? [])];
  let remoteWs;
  let closed = false;

  const onClientMessage = (data) => {
    if (closed) {
      return;
    }

    if (remoteWs?.readyState === remoteWs.OPEN) {
      remoteWs.send(data);
      return;
    }

    clientQueue.push(data);
  };

  clientWs.on("message", onClientMessage);

  try {
    remoteWs = await connectRemoteWebSocket(remoteUrl);
  } catch (error) {
    clientWs.off("message", onClientMessage);
    clientWs.close(1011, error instanceof Error ? error.message : "device ws connect failed");
    throw error;
  }

  const closeBoth = (code = 1000, reason = "") => {
    closed = true;
    clientWs.off("message", onClientMessage);
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

  const flushClientQueue = () => {
    if (remoteWs.readyState !== remoteWs.OPEN) {
      return;
    }

    while (clientQueue.length > 0) {
      remoteWs.send(clientQueue.shift());
    }
  };

  flushClientQueue();

  remoteWs.on("message", (data) => {
    if (clientWs.readyState === clientWs.OPEN) {
      clientWs.send(data);
    }
  });

  remoteWs.on("close", () => closeBoth(1000, "device ws closed"));
  remoteWs.on("error", (err) => closeBoth(1011, err?.message ?? "device ws error"));

  clientWs.on("close", () => closeBoth(1000, "client ws closed"));
  clientWs.on("error", () => closeBoth(1011, "client ws error"));

  return remoteWs;
}
