import { SCRCPY_SERVER_VERSION } from "../../config/scrcpy-paths.js";
import { logCastInfo } from "./cast-logger.js";
import { appendCastStartupLog } from "./startup-log.js";
import { listCastFeatures, resolveCastServerOptions } from "./cast-options.js";
import { resolveVideoStreamSummary } from "./video-stream-config.js";
import { CAST_TUNNEL_FORWARD } from "./server-args.js";
import { getCastSession } from "./session-store.js";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {import("./session-store.js").ScrcpyCastSession} session
 * @param {Record<string, unknown>} [options]
 */
export function buildCastStartPayload(session, options = {}) {
  const encoded = encodeURIComponent(session.serial);
  const serverOptions = resolveCastServerOptions(options);
  const features = listCastFeatures(serverOptions);
  const video = resolveVideoStreamSummary(options);
  const sessionKey = session.sessionKey || session.serial;
  const wsQuery =
    session.isolateServer && sessionKey !== session.serial
      ? `?sessionKey=${encodeURIComponent(sessionKey)}`
      : "";

  return {
    serial: session.serial,
    sessionKey,
    isolateServer: Boolean(session.isolateServer),
    windowId: session.windowId ?? null,
    deviceWsPort: session.deviceWsPort ?? null,
    mode: "scrcpy",
    serverVersion: session.serverVersion ?? SCRCPY_SERVER_VERSION,
    localPort: session.localPort,
    scid: session.scid,
    socketName: session.socketName,
    tunnel: CAST_TUNNEL_FORWARD,
    features,
    // Prefer this request's options (per-window new_display / start_app) over the
    // first consumer's stored castOptions — multi-app windows must not inherit
    // another window's package or display size.
    castOptions: { ...(session.castOptions ?? {}), ...options },
    video,
    wsPath: `/api/devices/${encoded}/cast/ws${wsQuery}`,
    controlWsPath: serverOptions.control
      ? `/api/devices/${encoded}/cast/control/ws${wsQuery}`
      : null,
    audio: serverOptions.audio,
    control: serverOptions.control,
    startupLogs: session.startupLogs ?? [],
    consumerCount: session.consumerCount ?? 1,
  };
}

/**
 * @param {import("./session-store.js").ScrcpyCastSession} session
 * @param {string} serial
 */
export async function waitForCastSessionReady(session, serial) {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    if (getCastSession(serial) !== session) {
      return false;
    }
    if (session.stopping || session.serverExited) {
      return false;
    }
    if (!session.starting) {
      return Boolean(session.shellProcess);
    }
    await delay(100);
  }

  return false;
}

/**
 * @param {import("./session-store.js").ScrcpyCastSession | null | undefined} existing
 * @param {string} serial
 * @param {Record<string, unknown>} options
 */
export function tryReuseCastSession(existing, serial, options) {
  if (!existing || existing.stopping || existing.serverExited || existing.starting) {
    return null;
  }

  // Shared web server may have detached adb shell (nohup) but still be alive.
  if (!existing.shellProcess && !existing.webCast && !existing.shellDetached) {
    return null;
  }

  existing.consumerCount = Math.max(1, Number(existing.consumerCount) || 1) + 1;
  logCastInfo(serial, "cast.start.reuse", {
    localPort: existing.localPort,
    consumerCount: existing.consumerCount,
  });
  appendCastStartupLog(existing, `后端：复用已有 scrcpy 会话 (consumers=${existing.consumerCount})`);
  return buildCastStartPayload(existing, options);
}
