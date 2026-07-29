import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { BACKEND_DATA_PATH } from "../config/paths.js";

const DATABASE_PATH = path.resolve(BACKEND_DATA_PATH, "cloud-phone.db");
const MAX_LOG_ENTRIES = 5000;
const DEFAULT_SETTINGS = Object.freeze({
  deviceListIntervalSeconds: 1,
  screenshotIntervalSeconds: 5,
});
const DEFAULT_PREFERENCES = Object.freeze({
  theme: "light",
  locale: "zh-CN",
});
const DEFAULT_RUNTIME_STATE = Object.freeze({
  activeTab: "devices",
  selectedDeviceSerial: "",
  groupControlGridSerials: [],
  groupControlActiveSerials: [],
});

fs.mkdirSync(BACKEND_DATA_PATH, { recursive: true });

const database = new DatabaseSync(DATABASE_PATH);
database.exec(`
  CREATE TABLE IF NOT EXISTS user_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS user_runtime_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS app_event_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    level TEXT NOT NULL,
    category TEXT NOT NULL,
    event TEXT NOT NULL,
    message TEXT NOT NULL,
    details TEXT,
    device_serial TEXT,
    device_name TEXT
  );
`);

const selectSettingsStatement = database.prepare("SELECT key, value FROM user_settings");
const upsertSettingStatement = database.prepare(`
  INSERT INTO user_settings (key, value, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET
    value = excluded.value,
    updated_at = excluded.updated_at
`);
const selectRuntimeStatement = database.prepare("SELECT key, value FROM user_runtime_state");
const upsertRuntimeStatement = database.prepare(`
  INSERT INTO user_runtime_state (key, value, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET
    value = excluded.value,
    updated_at = excluded.updated_at
`);
const insertLogStatement = database.prepare(`
  INSERT INTO app_event_logs (
    timestamp,
    level,
    category,
    event,
    message,
    details,
    device_serial,
    device_name
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const selectLogsStatement = database.prepare(`
  SELECT id, timestamp, level, category, event, message, details, device_serial, device_name
  FROM app_event_logs
  ORDER BY id DESC
  LIMIT ?
`);
const clearLogsStatement = database.prepare("DELETE FROM app_event_logs");
const trimLogsStatement = database.prepare(`
  DELETE FROM app_event_logs
  WHERE id NOT IN (
    SELECT id FROM app_event_logs ORDER BY id DESC LIMIT ?
  )
`);

function safeParseJson(value, fallback) {
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function readSettingsRows() {
  const out = {};
  for (const row of selectSettingsStatement.all()) {
    out[row.key] = safeParseJson(row.value, null);
  }
  return out;
}

function readRuntimeRows() {
  const out = {};
  for (const row of selectRuntimeStatement.all()) {
    out[row.key] = safeParseJson(row.value, null);
  }
  return out;
}

function normalizeInterval(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(120, Math.max(1, Math.round(n)));
}

function normalizeString(value, fallback) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))];
}

export function getStoredSettings() {
  const rows = readSettingsRows();
  return {
    ...DEFAULT_SETTINGS,
    ...DEFAULT_PREFERENCES,
    deviceListIntervalSeconds: normalizeInterval(
      rows.deviceListIntervalSeconds,
      DEFAULT_SETTINGS.deviceListIntervalSeconds,
    ),
    screenshotIntervalSeconds: normalizeInterval(
      rows.screenshotIntervalSeconds,
      DEFAULT_SETTINGS.screenshotIntervalSeconds,
    ),
    theme: normalizeString(rows.theme, DEFAULT_PREFERENCES.theme),
    locale: normalizeString(rows.locale, DEFAULT_PREFERENCES.locale),
  };
}

export function patchStoredSettings(patch = {}) {
  const current = getStoredSettings();
  const next = {
    ...current,
    ...(patch.deviceListIntervalSeconds !== undefined
      ? {
          deviceListIntervalSeconds: normalizeInterval(
            patch.deviceListIntervalSeconds,
            current.deviceListIntervalSeconds,
          ),
        }
      : {}),
    ...(patch.screenshotIntervalSeconds !== undefined
      ? {
          screenshotIntervalSeconds: normalizeInterval(
            patch.screenshotIntervalSeconds,
            current.screenshotIntervalSeconds,
          ),
        }
      : {}),
    ...(patch.theme !== undefined ? { theme: normalizeString(patch.theme, current.theme) } : {}),
    ...(patch.locale !== undefined ? { locale: normalizeString(patch.locale, current.locale) } : {}),
  };
  const now = new Date().toISOString();
  for (const [key, value] of Object.entries(next)) {
    upsertSettingStatement.run(key, JSON.stringify(value), now);
  }
  return next;
}

export function getStoredRuntimeState() {
  const rows = readRuntimeRows();
  return {
    ...DEFAULT_RUNTIME_STATE,
    // Keep known fields normalized for backward compatibility.
    activeTab: normalizeString(rows.activeTab, DEFAULT_RUNTIME_STATE.activeTab),
    selectedDeviceSerial: String(rows.selectedDeviceSerial || ""),
    groupControlGridSerials: normalizeStringArray(rows.groupControlGridSerials),
    groupControlActiveSerials: normalizeStringArray(rows.groupControlActiveSerials),
    // Keep any extra runtime keys (e.g. icon helper consent).
    ...rows,
  };
}

export function patchStoredRuntimeState(patch = {}) {
  const current = getStoredRuntimeState();
  const now = new Date().toISOString();

  /** @type {Record<string, any>} */
  const updates = {};

  if (patch.activeTab !== undefined) {
    updates.activeTab = normalizeString(patch.activeTab, current.activeTab);
  }
  if (patch.selectedDeviceSerial !== undefined) {
    updates.selectedDeviceSerial = String(patch.selectedDeviceSerial || "");
  }
  if (patch.groupControlGridSerials !== undefined) {
    updates.groupControlGridSerials = normalizeStringArray(patch.groupControlGridSerials);
  }
  if (patch.groupControlActiveSerials !== undefined) {
    updates.groupControlActiveSerials = normalizeStringArray(patch.groupControlActiveSerials);
  }

  // Allow arbitrary extra keys for runtime preferences.
  for (const [key, value] of Object.entries(patch)) {
    if (
      key === "activeTab" ||
      key === "selectedDeviceSerial" ||
      key === "groupControlGridSerials" ||
      key === "groupControlActiveSerials"
    ) {
      continue;
    }
    updates[key] = value;
  }

  for (const [key, value] of Object.entries(updates)) {
    upsertRuntimeStatement.run(key, JSON.stringify(value), now);
  }

  return getStoredRuntimeState();
}

function trimLogsIfNeeded() {
  trimLogsStatement.run(MAX_LOG_ENTRIES);
}

export function appendStoredLog(entry = {}) {
  const timestamp = String(entry.timestamp || new Date().toISOString());
  insertLogStatement.run(
    timestamp,
    normalizeString(entry.level, "info"),
    normalizeString(entry.category, "ui"),
    normalizeString(entry.event, "event"),
    normalizeString(entry.message, ""),
    entry.details == null ? null : JSON.stringify(entry.details),
    entry.deviceSerial ? String(entry.deviceSerial) : null,
    entry.deviceName ? String(entry.deviceName) : null,
  );
  trimLogsIfNeeded();
}

export function listStoredLogs(limit = 2000) {
  const rows = selectLogsStatement.all(Math.min(MAX_LOG_ENTRIES, Math.max(1, Number(limit) || 2000)));
  return rows.map((row) => ({
    id: row.id,
    timestamp: row.timestamp,
    level: row.level,
    category: row.category,
    event: row.event,
    message: row.message,
    details: row.details ? safeParseJson(row.details, null) : null,
    deviceSerial: row.device_serial,
    deviceName: row.device_name,
  }));
}

export function clearStoredLogs() {
  clearLogsStatement.run();
}
