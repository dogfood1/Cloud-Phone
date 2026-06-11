import net from "node:net";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function probeTcpPort(port, host = "127.0.0.1", timeoutMs = 500) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    let settled = false;

    const finish = (ok) => {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve(ok);
    };

    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(timeoutMs, () => finish(false));
  });
}

/**
 * Wait until adb forward local port accepts TCP connections (ws-scrcpy server ready).
 */
export async function waitForLocalPortOpen(port, options = {}) {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const intervalMs = options.intervalMs ?? 200;
  const shouldAbort = options.shouldAbort ?? (() => false);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (shouldAbort()) {
      const error = new Error("Stopped while waiting for local cast port.");
      error.code = "cast_port_wait_aborted";
      throw error;
    }

    if (await probeTcpPort(port)) {
      return true;
    }

    await delay(intervalMs);
  }

  const error = new Error(`Local cast port ${port} is not ready.`);
  error.code = "cast_port_not_ready";
  throw error;
}
