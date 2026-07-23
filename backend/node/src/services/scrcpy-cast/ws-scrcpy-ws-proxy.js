import WS from "ws";

import { logCastError, logCastInfo, logCastWarn } from "./cast-logger.js";
import { getCastSession } from "./session-store.js";
import { appendCastStartupLog } from "./startup-log.js";
import { shouldLogPacketSummary, summarizeWsPacket } from "./ws-packet-summary.js";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function delayWithAbort(ms, shouldAbort) {
  const step = 50;
  let elapsed = 0;

  while (elapsed < ms) {
    if (shouldAbort()) {
      const error = new Error("WebSocket proxy connect aborted.");
      error.code = "proxy_connect_aborted";
      throw error;
    }

    const chunk = Math.min(step, ms - elapsed);
    await delay(chunk);
    elapsed += chunk;
  }
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
 * Connect to device WebSocket and buffer early frames (scrcpy_initial is sent
 * immediately on open — must not race past the message listener).
 * @param {string} remoteUrl
 * @param {{ attempts?: number, intervalMs?: number, serial?: string, shouldAbort?: () => boolean }} [options]
 * @returns {Promise<{ remoteWs: import("ws").WebSocket, earlyRemoteMessages: unknown[] }>}
 */
async function connectRemoteWebSocket(remoteUrl, options = {}) {
  const attempts = options.attempts ?? 20;
  const intervalMs = options.intervalMs ?? 300;
  const serial = options.serial ?? "-";
  const shouldAbort = options.shouldAbort ?? (() => false);
  let lastError = new Error("Unable to connect device WebSocket.");

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (shouldAbort()) {
      const error = new Error("WebSocket proxy connect aborted.");
      error.code = "proxy_connect_aborted";
      throw error;
    }

    logCastInfo(serial, "ws.proxy.connect_attempt", { remoteUrl, attempt, attempts });

    try {
      const connected = await new Promise((resolve, reject) => {
        if (shouldAbort()) {
          reject(new Error("WebSocket proxy connect aborted."));
          return;
        }

        const ws = new WS(remoteUrl);
        const earlyRemoteMessages = [];
        /** @type {(data: unknown) => void} */
        let messageSink = (data) => {
          earlyRemoteMessages.push(data);
        };
        const onMessage = (data) => {
          messageSink(data);
        };
        const timer = setTimeout(() => {
          ws.terminate();
          reject(new Error("device WebSocket open timeout"));
        }, 5_000);

        const cleanup = () => {
          clearTimeout(timer);
          ws.off("open", onOpen);
          ws.off("error", onError);
        };

        const onOpen = () => {
          cleanup();
          resolve({
            remoteWs: ws,
            earlyRemoteMessages,
            adoptMessageSink: (nextSink) => {
              messageSink = nextSink;
            },
            detachMessage: () => {
              ws.off("message", onMessage);
            },
          });
        };

        const onError = (error) => {
          cleanup();
          ws.off("message", onMessage);
          reject(error instanceof Error ? error : new Error(String(error)));
        };

        // Attach BEFORE open — server sends scrcpy_initial in onOpen.
        ws.on("message", onMessage);
        ws.once("open", onOpen);
        ws.once("error", onError);
      });

      logCastInfo(serial, "ws.proxy.connect_ok", {
        remoteUrl,
        attempt,
        earlyRemote: connected.earlyRemoteMessages.length,
      });
      return connected;
    } catch (error) {
      lastError = error instanceof Error ? error : lastError;

      if (shouldAbort() || lastError.message.includes("aborted")) {
        const abortError = new Error("WebSocket proxy connect aborted.");
        abortError.code = "proxy_connect_aborted";
        throw abortError;
      }

      logCastWarn(serial, "ws.proxy.connect_retry", {
        remoteUrl,
        attempt,
        message: lastError.message,
      });

      if (attempt < attempts) {
        await delayWithAbort(intervalMs, shouldAbort);
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
 * @param {{ prefetchedClientMessages?: unknown[], serial?: string, shouldAbort?: () => boolean }} [options]
 */
export async function proxyWebSocket(clientWs, remoteUrl, options = {}) {
  const serial = options.serial ?? "-";
  const shouldAbort = options.shouldAbort ?? (() => false);
  const clientQueue = [...(options.prefetchedClientMessages ?? [])];
  const counters = {
    clientToRemote: 0,
    remoteToClient: 0,
    queued: 0,
    flushed: 0,
    earlyRemoteFlushed: 0,
  };
  let remoteWs;
  let closed = false;
  /** @type {null | (() => void)} */
  let detachRemoteMessage = null;

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

  // Attach before connecting so browser type-101 during dial is queued.
  clientWs.on("message", onClientMessage);
  try {
    options.onProxyListening?.();
  } catch {
    // ignore
  }

  let earlyRemoteMessages = [];
  /** @type {null | ((sink: (data: unknown) => void) => void)} */
  let adoptMessageSink = null;

  try {
    const connected = await connectRemoteWebSocket(remoteUrl, { serial, shouldAbort });
    remoteWs = connected.remoteWs;
    earlyRemoteMessages = connected.earlyRemoteMessages;
    adoptMessageSink = connected.adoptMessageSink;
    detachRemoteMessage = connected.detachMessage;
  } catch (error) {
    clientWs.off("message", onClientMessage);

    if (error?.code === "proxy_connect_aborted") {
      logCastInfo(serial, "ws.proxy.connect_aborted", { remoteUrl });
      if (clientWs.readyState === WS.OPEN) {
        clientWs.close(1000, "cast stopped");
      }
      return null;
    }

    clientWs.close(1011, error instanceof Error ? error.message : "device ws connect failed");
    throw error;
  }

  const forwardRemoteToClient = (data) => {
    if (closed) {
      return;
    }

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
  };

  const closeBoth = (code = 1000, reason = "", source = "unknown") => {
    if (closed) {
      return;
    }

    closed = true;
    clientWs.off("message", onClientMessage);
    detachRemoteMessage?.();
    detachRemoteMessage = null;

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

  // Point the single remote message listener at live forward, then flush early frames.
  adoptMessageSink?.(forwardRemoteToClient);
  for (const data of earlyRemoteMessages) {
    counters.earlyRemoteFlushed += 1;
    forwardRemoteToClient(data);
  }
  earlyRemoteMessages.length = 0;

  if (counters.earlyRemoteFlushed > 0) {
    logCastInfo(serial, "ws.proxy.early_remote_flushed", {
      flushed: counters.earlyRemoteFlushed,
    });
  }

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
      logCastInfo(serial, "ws.proxy.queue_flushed", {
        flushed: pending,
        totalFlushed: counters.flushed,
      });
    }
  };

  flushClientQueue();

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
  appendCastStartupLog(getCastSession(serial), "后端：WebSocket 代理已连接设备 scrcpy-server");

  return remoteWs;
}
