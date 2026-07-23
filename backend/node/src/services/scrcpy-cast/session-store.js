import { summarizeStreamStats } from "./stream-stats.js";

/** @typedef {import("node:child_process").ChildProcessWithoutNullStreams} ShellProcess */
/** @typedef {import("node:net").Socket} TcpSocket */

/**
 * @typedef {object} ScrcpyCastSession
 * @property {string} serial
 * @property {string} [sessionKey]
 * @property {boolean} [isolateServer]
 * @property {string} [windowId]
 * @property {number} [deviceWsPort]
 * @property {number} scid
 * @property {string} tunnelMode
 * @property {Record<string, unknown>} castOptions
 * @property {string} socketName
 * @property {number} localPort
 * @property {ShellProcess | null} shellProcess
 * @property {TcpSocket | null} videoSocket
 * @property {import("node:net").Server | null} tcpServer
 * @property {Promise<import("node:net").Socket> | null} videoListenPromise
 * @property {Set<import("ws").WebSocket>} clients
 * @property {boolean} starting
 * @property {boolean} streaming
 * @property {ReturnType<import("./stream-stats.js").createStreamStats>} streamStats
 * @property {boolean} serverExited
 * @property {number | null} serverExitCode
 * @property {string | null} serverExitSignal
 * @property {number} startedAt
 */

/** @type {Map<string, ScrcpyCastSession>} */
const sessionsByKey = new Map();

export function getCastSession(sessionKey) {
  if (!sessionKey) {
    return null;
  }
  return sessionsByKey.get(sessionKey) ?? null;
}

export function setCastSession(sessionKey, session) {
  session.sessionKey = sessionKey;
  sessionsByKey.set(sessionKey, session);
}

export function deleteCastSession(sessionKey) {
  if (sessionKey) {
    sessionsByKey.delete(sessionKey);
  }
}

export function listCastSessionKeys() {
  return [...sessionsByKey.keys()];
}

export function listCastSerials() {
  return [...new Set([...sessionsByKey.values()].map((s) => s.serial))];
}

export function listCastSessions() {
  return [...sessionsByKey.values()].map((session) => ({
    serial: session.serial,
    sessionKey: session.sessionKey,
    isolateServer: Boolean(session.isolateServer),
    windowId: session.windowId ?? null,
    deviceWsPort: session.deviceWsPort ?? null,
    localPort: session.localPort,
    scid: session.scid,
    socketName: session.socketName,
    streaming: session.streaming,
    clients: session.clients.size,
    serverExited: session.serverExited ?? false,
    stream: summarizeStreamStats(session.streamStats),
  }));
}

/** @param {string} serial */
export function listSessionsForSerial(serial) {
  return [...sessionsByKey.values()].filter((session) => session.serial === serial);
}
