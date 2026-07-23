import WS from "ws";

import { logCastError, logCastInfo, logCastWarn } from "./cast-logger.js";

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

/**
 * Connect to device WebSocket and buffer early frames (scrcpy_initial is sent
 * immediately on open — must not race past the message listener).
 * @param {string} remoteUrl
 * @param {{ attempts?: number, intervalMs?: number, serial?: string, shouldAbort?: () => boolean }} [options]
 */
export async function connectRemoteWebSocket(remoteUrl, options = {}) {
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

        const ws = new WS(remoteUrl, {
          perMessageDeflate: false,
        });
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
