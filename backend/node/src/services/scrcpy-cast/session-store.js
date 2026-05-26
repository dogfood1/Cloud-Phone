import { summarizeStreamStats } from "./stream-stats.js";

/** @typedef {import("node:child_process").ChildProcessWithoutNullStreams} ShellProcess */
/** @typedef {import("node:net").Socket} TcpSocket */

/**
 * @typedef {object} ScrcpyCastSession
 * @property {string} serial
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
const sessionsBySerial = new Map();

export function getCastSession(serial) {
  return sessionsBySerial.get(serial) ?? null;
}

export function setCastSession(serial, session) {
  sessionsBySerial.set(serial, session);
}

export function deleteCastSession(serial) {
  sessionsBySerial.delete(serial);
}

export function listCastSerials() {
  return [...sessionsBySerial.keys()];
}

export function listCastSessions() {
  return [...sessionsBySerial.values()].map((session) => ({
    serial: session.serial,
    localPort: session.localPort,
    scid: session.scid,
    socketName: session.socketName,
    streaming: session.streaming,
    clients: session.clients.size,
    serverExited: session.serverExited ?? false,
    stream: summarizeStreamStats(session.streamStats),
  }));
}
