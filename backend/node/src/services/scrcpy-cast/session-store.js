/** @typedef {import("node:child_process").ChildProcessWithoutNullStreams} ShellProcess */
/** @typedef {import("node:net").Socket} TcpSocket */

/**
 * @typedef {object} ScrcpyCastSession
 * @property {string} serial
 * @property {number} scid
 * @property {string} socketName
 * @property {number} localPort
 * @property {ShellProcess} shellProcess
 * @property {TcpSocket | null} videoSocket
 * @property {Set<import("ws").WebSocket>} clients
 * @property {boolean} starting
 * @property {boolean} streaming
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
    streaming: session.streaming,
    clients: session.clients.size,
  }));
}
