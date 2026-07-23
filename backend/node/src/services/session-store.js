import {
  clearPersistedSessions,
  deletePersistedSession,
  listPersistedSessions,
  upsertPersistedSession,
} from "./auth-store.js";

/** @type {Map<string, { encryptionKey: Buffer, expiresAt: number }>} */
const sessions = new Map();
let hydrated = false;

function ensureHydrated() {
  if (hydrated) {
    return;
  }
  hydrated = true;
  for (const row of listPersistedSessions()) {
    if (row.expiresAt <= Date.now()) {
      deletePersistedSession(row.token);
      continue;
    }
    sessions.set(row.token, {
      encryptionKey: row.encryptionKey,
      expiresAt: row.expiresAt,
    });
  }
}

export function registerSession(token, encryptionKey, expiresAtIso) {
  ensureHydrated();
  const expiresAt = new Date(expiresAtIso).getTime();

  if (Number.isNaN(expiresAt) || !token) {
    return;
  }

  const keyBuffer = Buffer.from(encryptionKey);
  sessions.set(token, {
    encryptionKey: keyBuffer,
    expiresAt,
  });
  upsertPersistedSession(token, keyBuffer, expiresAtIso);
}

export function getSessionRecord(token) {
  ensureHydrated();
  if (!token) {
    return null;
  }

  const record = sessions.get(token);

  if (!record) {
    return null;
  }

  if (record.expiresAt <= Date.now()) {
    sessions.delete(token);
    deletePersistedSession(token);
    return null;
  }

  return record;
}

export function removeSession(token) {
  ensureHydrated();
  if (token) {
    sessions.delete(token);
    deletePersistedSession(token);
  }
}

export function clearAllSessions() {
  ensureHydrated();
  sessions.clear();
  clearPersistedSessions();
}

export function clearExpiredSessions() {
  ensureHydrated();
  const now = Date.now();

  for (const [token, record] of sessions.entries()) {
    if (record.expiresAt <= now) {
      sessions.delete(token);
      deletePersistedSession(token);
    }
  }
}
