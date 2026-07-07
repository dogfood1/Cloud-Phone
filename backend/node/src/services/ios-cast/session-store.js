/** @type {Map<string, object>} */
const sessions = new Map();

export function getIosCastSession(serial) {
  return sessions.get(serial) ?? null;
}

export function setIosCastSession(serial, session) {
  sessions.set(serial, session);
  return session;
}

export function deleteIosCastSession(serial) {
  sessions.delete(serial);
}
