/** @type {Map<string, { encryptionKey: Buffer, expiresAt: number }>} */
const sessions = new Map();

export function registerSession(token, encryptionKey, expiresAtIso) {
  const expiresAt = new Date(expiresAtIso).getTime();

  if (Number.isNaN(expiresAt)) {
    return;
  }

  sessions.set(token, {
    encryptionKey: Buffer.from(encryptionKey),
    expiresAt,
  });
}

export function getSessionRecord(token) {
  if (!token) {
    return null;
  }

  const record = sessions.get(token);

  if (!record) {
    return null;
  }

  if (record.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }

  return record;
}

export function removeSession(token) {
  if (token) {
    sessions.delete(token);
  }
}

export function clearExpiredSessions() {
  const now = Date.now();

  for (const [token, record] of sessions.entries()) {
    if (record.expiresAt <= now) {
      sessions.delete(token);
    }
  }
}
