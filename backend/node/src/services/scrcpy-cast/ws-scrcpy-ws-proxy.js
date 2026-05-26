import WS from "ws";

import { logCastError, logCastInfo, logCastWarn } from "./cast-logger.js";
import { shouldLogPacketSummary, summarizeWsPacket } from "./ws-packet-summary.js";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toBuffer(data) {
  if (Buffer.isBuffer(data)) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }

  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }

  return Buffer.from(data);
}

/**
 * Connect to device WebSocket with retries (server may still be starting).
 * @param {string} remoteUrl
 * @param {{ attempts?: number, intervalMs?: number, serial?: string }} [options]
 */
async function connectRemoteWebSocket(remoteUrl, options = {}) {
  const attempts = options.attempts ?? 12;
  const intervalMs = options.intervalMs ?? 250;
  const serial = options.serial ?? "-";
  let lastError = new Error("Unable to connect device WebSocket.");

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    logCastInfo(serial, "ws.proxy.connect_attempt", { remoteUrl, attempt, attempts });

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

      logCastInfo(serial, "ws.proxy.connect_ok", { remoteUrl, attempt });
      return remoteWs;
    } catch (error) {
      lastError = error instanceof Error ? error : lastError;
      logCastWarn(serial, "ws.proxy.connect_retry", {
        remoteUrl,
        attempt,
        message: lastError.message,
      });

      if (attempt < attempts) {
        await delay(intervalMs);
      }
    }
  }

  logCastError(serial, "ws.proxy.connect_failed", {
    remoteUrl,
    attempts,
    message: lastError.message,
  });

  throw lastError;
}

function logProxyPacket(serial, direction, data, counters) {
  const buffer = toBuffer(data);
  const summary = summarizeWsPacket(buffer);

  if (!shouldLogPacketSummary(summary, counters, direction)) {
    return;
  }

  logCastInfo(serial, `ws.proxy.${direction}`, summary);
}

/**
 * Proxy a browser WebSocket to a device WebSocket endpoint.
 * @param {import("ws").WebSocket} clientWs
 * @param {string} remoteUrl
 * @param {{ prefetchedClientMessages?: unknown[], serial?: string }} [options]
 */
export async function proxyWebSocket(clientWs, remoteUrl, options = {}) {
  const serial = options.serial ?? "-";
  const clientQueue = [...(options.prefetchedClientMessages ?? [])];
  const counters = {
    clientToRemote: 0,
    remoteToClient: 0,
    queued: 0,
    flushed: 0,
  };
  let remoteWs;
  let closed = false;

  logCastInfo(serial, "ws.proxy.start", {
    remoteUrl,
    prefetched: clientQueue.length,
    clientReadyState: clientWs.readyState,
  });

  const onClientMessage = (data) => {
    if (closed) {
      return;
    }

    counters.clientToRemote += 1;
    logProxyPacket(serial, "client_to_remote", data, counters);

    if (remoteWs && remoteWs.readyState === WS.OPEN) {
      remoteWs.send(toBuffer(data));
      return;
    }

    clientQueue.push(data);
    counters.queued += 1;

    if (counters.queued <= 5 || counters.queued % 20 === 0) {
      logCastInfo(serial, "ws.proxy.client_queued", {
        queueLength: clientQueue.length,
        remoteReady: remoteWs?.readyState ?? "pending",
        totalQueued: counters.queued,
      });
    }
  };

  clientWs.on("message", onClientMessage);

  try {
    remoteWs = await connectRemoteWebSocket(remoteUrl, { serial });
  } catch (error) {
    clientWs.off("message", onClientMessage);
    clientWs.close(1011, error instanceof Error ? error.message : "device ws connect failed");
    throw error;
  }

  const closeBoth = (code = 1000, reason = "", source = "unknown") => {
    if (closed) {
      return;
    }

    closed = true;
    clientWs.off("message", onClientMessage);

    logCastInfo(serial, "ws.proxy.close", {
      source,
      code,
      reason: reason || undefined,
      stats: counters,
      queueRemaining: clientQueue.length,
    });

    try {
      if (clientWs.readyState === WS.OPEN) {
        clientWs.close(code, reason);
      }
    } catch {
      // ignore
    }

    try {
      if (remoteWs.readyState === WS.OPEN) {
        remoteWs.close(code, reason);
      }
    } catch {
      // ignore
    }
  };

  const flushClientQueue = () => {
    if (remoteWs.readyState !== WS.OPEN) {
      logCastWarn(serial, "ws.proxy.flush_skipped", {
        remoteReadyState: remoteWs.readyState,
        queueLength: clientQueue.length,
      });
      return;
    }

    const pending = clientQueue.length;

    while (clientQueue.length > 0) {
      const item = clientQueue.shift();
      remoteWs.send(toBuffer(item));
      counters.flushed += 1;
    }

    if (pending > 0) {
      logCastInfo(serial, "ws.proxy.queue_flushed", { flushed: pending, totalFlushed: counters.flushed });
    }
  };

  flushClientQueue();

  remoteWs.on("message", (data) => {
    counters.remoteToClient += 1;
    logProxyPacket(serial, "remote_to_client", data, counters);

    if (clientWs.readyState === WS.OPEN) {
      clientWs.send(data);
    } else {
      logCastWarn(serial, "ws.proxy.drop_remote", {
        clientReadyState: clientWs.readyState,
        packet: summarizeWsPacket(data),
      });
    }
  });

  remoteWs.on("close", (code, reason) => {
    closeBoth(code, reason.toString(), "device_ws_closed");
  });
  remoteWs.on("error", (err) => {
    logCastError(serial, "ws.proxy.remote_error", { message: err?.message ?? "device ws error" });
    closeBoth(1011, err?.message ?? "device ws error", "device_ws_error");
  });

  clientWs.on("close", (code, reason) => {
    closeBoth(code, reason.toString(), "client_ws_closed");
  });
  clientWs.on("error", (err) => {
    logCastError(serial, "ws.proxy.client_error", { message: err?.message ?? "client ws error" });
    closeBoth(1011, err?.message ?? "client ws error", "client_ws_error");
  });

  logCastInfo(serial, "ws.proxy.ready", { remoteUrl, stats: counters });

  return remoteWs;
}
