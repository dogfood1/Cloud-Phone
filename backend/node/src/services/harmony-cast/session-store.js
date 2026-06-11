/** @type {Map<string, object>} */
const sessions = new Map();

export function getHarmonyCastSession(serial) {
  return sessions.get(serial) ?? null;
}

export function setHarmonyCastSession(serial, session) {
  sessions.set(serial, session);
}

export function deleteHarmonyCastSession(serial) {
  sessions.delete(serial);
}
