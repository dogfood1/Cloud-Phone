import net from "node:net";

/**
 * Probe whether 127.0.0.1:port can be bound.
 * Catches Windows Hyper-V / excluded-range WSAEACCES (10013) before adb forward.
 */
export function canListenLocally(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    const finish = (ok) => {
      try {
        server.removeAllListeners();
        server.close();
      } catch {
        // ignore
      }
      resolve(ok);
    };
    server.once("error", () => finish(false));
    server.once("listening", () => finish(true));
    try {
      server.listen({ host: "127.0.0.1", port, exclusive: true });
    } catch {
      finish(false);
    }
  });
}

/**
 * Pick a free local TCP port for adb/hdc forward.
 * Default band avoids the old 37xxx range that often lands in Hyper-V exclusions.
 */
export async function pickAvailableLocalPort(options = {}) {
  const min = Number(options.min) > 0 ? Number(options.min) : 19_100;
  const max = Number(options.max) > min ? Number(options.max) : 24_900;
  const attempts = Math.max(8, Number(options.attempts) || 48);
  const tried = new Set();

  for (let i = 0; i < attempts; i += 1) {
    const port = min + Math.floor(Math.random() * (max - min + 1));
    if (tried.has(port)) {
      continue;
    }
    tried.add(port);
    if (await canListenLocally(port)) {
      return port;
    }
  }

  throw new Error(
    `No free local port in ${min}-${max} for device tunnel (Windows excluded ranges / busy ports).`,
  );
}

export function isPortBindAccessDenied(error) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    /10013|EACCES|access permissions|访问权限|cannot bind listener|WSAEACCES/i.test(
      message,
    )
  );
}
