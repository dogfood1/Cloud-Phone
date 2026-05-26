import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { BACKEND_DATA_PATH } from "../config/paths.js";

const DATABASE_PATH = path.resolve(BACKEND_DATA_PATH, "cloud-phone.db");
const KEY_PATH = path.resolve(BACKEND_DATA_PATH, "auth.key");

fs.mkdirSync(BACKEND_DATA_PATH, { recursive: true });

const database = new DatabaseSync(DATABASE_PATH);
database.exec(`
  CREATE TABLE IF NOT EXISTS auth_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

const selectSettingStatement = database.prepare(
  "SELECT value, updated_at FROM auth_settings WHERE key = ?",
);
const upsertSettingStatement = database.prepare(`
  INSERT INTO auth_settings (key, value, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET
    value = excluded.value,
    updated_at = excluded.updated_at
`);

const encryptionKey = loadOrCreateEncryptionKey();

export function getAuthKeyMaterial() {
  return encryptionKey;
}

export function getPasswordRecord() {
  const row = selectSettingStatement.get("password_record");

  if (!row) {
    return null;
  }

  try {
    const decrypted = decryptValue(row.value);
    return {
      ...JSON.parse(decrypted),
      updatedAt: row.updated_at,
    };
  } catch {
    console.warn("[auth] Password record is unreadable. Treating as not configured.");
    return null;
  }
}

export function savePasswordRecord(record) {
  const timestamp = new Date().toISOString();
  const encryptedValue = encryptValue(
    JSON.stringify({
      algorithm: record.algorithm,
      salt: record.salt,
      hash: record.hash,
    }),
  );

  upsertSettingStatement.run("password_record", encryptedValue, timestamp);

  return {
    ...record,
    updatedAt: timestamp,
  };
}

function loadOrCreateEncryptionKey() {
  if (fs.existsSync(KEY_PATH)) {
    return fs.readFileSync(KEY_PATH);
  }

  const nextKey = crypto.randomBytes(32);
  fs.writeFileSync(KEY_PATH, nextKey);
  return nextKey;
}

function encryptValue(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: encrypted.toString("base64"),
  });
}

function decryptValue(serializedValue) {
  const payload = JSON.parse(serializedValue);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey,
    Buffer.from(payload.iv, "base64"),
  );

  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
