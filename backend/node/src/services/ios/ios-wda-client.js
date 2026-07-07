const DEFAULT_HTTP_PORT = 8100;
const DEFAULT_MJPEG_PORT = 9100;
const REQUEST_TIMEOUT_MS = 12_000;

/** @type {Map<string, string>} */
const sessionByEndpoint = new Map();

function endpointKey(host, httpPort) {
  return `${host}:${httpPort}`;
}

async function wdaFetch(host, httpPort, pathname, { method = "GET", body } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`http://${host}:${Number(httpPort)}${pathname}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    let payload = null;

    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { value: text };
    }

    if (!response.ok) {
      const message =
        payload?.value?.message ||
        payload?.message ||
        `WDA ${method} ${pathname} failed (${response.status})`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return payload;
  } finally {
    clearTimeout(timer);
  }
}

export async function probeWdaStatus(host, httpPort = DEFAULT_HTTP_PORT) {
  const payload = await wdaFetch(host, httpPort, "/status");
  return payload?.value ?? payload;
}

export async function fetchWdaDeviceInfo(host, httpPort = DEFAULT_HTTP_PORT) {
  const payload = await wdaFetch(host, httpPort, "/wda/device/info");
  return payload?.value ?? payload;
}

export async function fetchWdaScreen(host, httpPort = DEFAULT_HTTP_PORT) {
  const payload = await wdaFetch(host, httpPort, "/wda/screen");
  const value = payload?.value ?? payload;
  const screen = value?.screen ?? value;
  const width = Number(screen?.width ?? screen?.size?.width ?? 0);
  const height = Number(screen?.height ?? screen?.size?.height ?? 0);

  return {
    width: width || null,
    height: height || null,
    scale: Number(screen?.scale ?? 1) || 1,
    statusBarSize: screen?.statusBarSize ?? null,
  };
}

export async function captureWdaScreenshot(host, httpPort = DEFAULT_HTTP_PORT) {
  const payload = await wdaFetch(host, httpPort, "/screenshot");
  const base64 = payload?.value ?? payload;

  if (typeof base64 !== "string" || !base64) {
    throw new Error("WDA screenshot payload is empty.");
  }

  return Buffer.from(base64, "base64");
}

export async function ensureWdaSession(host, httpPort = DEFAULT_HTTP_PORT) {
  const key = endpointKey(host, httpPort);
  const existing = sessionByEndpoint.get(key);

  if (existing) {
    return existing;
  }

  const payload = await wdaFetch(host, httpPort, "/session", {
    method: "POST",
    body: {
      capabilities: {
        alwaysMatch: {
          bundleId: "com.apple.springboard",
          shouldWaitForQuiescence: false,
        },
      },
    },
  });

  const sessionId = payload?.value?.sessionId ?? payload?.sessionId;

  if (!sessionId) {
    throw new Error("Failed to create WDA session.");
  }

  sessionByEndpoint.set(key, sessionId);
  return sessionId;
}

export async function wdaTap(host, httpPort, x, y) {
  await ensureWdaSession(host, httpPort);
  await wdaFetch(host, httpPort, "/wda/tap", {
    method: "POST",
    body: { x: Math.round(x), y: Math.round(y) },
  });
}

export async function wdaDrag(host, httpPort, fromX, fromY, toX, toY) {
  await ensureWdaSession(host, httpPort);
  await wdaFetch(host, httpPort, "/wda/dragfromtoforduration", {
    method: "POST",
    body: {
      fromX: Math.round(fromX),
      fromY: Math.round(fromY),
      toX: Math.round(toX),
      toY: Math.round(toY),
      duration: 0.35,
    },
  });
}

export async function wdaPressButton(host, httpPort, name) {
  await wdaFetch(host, httpPort, "/wda/pressButton", {
    method: "POST",
    body: { name },
  });
}

export async function wdaHomescreen(host, httpPort) {
  await wdaFetch(host, httpPort, "/wda/homescreen", { method: "POST", body: {} });
}

export async function wdaLock(host, httpPort) {
  await wdaFetch(host, httpPort, "/wda/lock", { method: "POST", body: {} });
}

export async function wdaUnlock(host, httpPort) {
  await wdaFetch(host, httpPort, "/wda/unlock", { method: "POST", body: {} });
}

export function normalizeIosEndpoint(input = {}) {
  const host = String(input.host ?? "").trim();
  const httpPort = Number(input.httpPort ?? input.http_port ?? DEFAULT_HTTP_PORT);
  const mjpegPort = Number(input.mjpegPort ?? input.mjpeg_port ?? DEFAULT_MJPEG_PORT);

  if (!host) {
    throw new Error("host is required.");
  }

  if (!Number.isInteger(httpPort) || httpPort <= 0 || httpPort > 65535) {
    throw new Error("httpPort is invalid.");
  }

  if (!Number.isInteger(mjpegPort) || mjpegPort <= 0 || mjpegPort > 65535) {
    throw new Error("mjpegPort is invalid.");
  }

  return { host, httpPort, mjpegPort };
}
