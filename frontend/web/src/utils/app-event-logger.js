import { reactive, readonly } from "vue";
import {
  clearAllPersistedLogs,
  persistLogEntry,
  replaceCachedLogs,
} from "./local-persistence-state.js";

/** @typedef {"debug" | "info" | "warn" | "error"} LogLevel */
/** @typedef {"auth" | "navigation" | "device" | "cast" | "stream" | "settings" | "ui"} LogCategory */

export const LOG_LEVELS = ["debug", "info", "warn", "error"];
export const LOG_CATEGORIES = ["auth", "navigation", "device", "cast", "stream", "settings", "ui"];

const MAX_ENTRIES = 2000;
let nextId = 1;

const state = reactive({
  entries: [],
});

function formatDisplayTime(date = new Date()) {
  return date.toLocaleString("zh-CN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function normalizeDetails(details) {
  if (details == null) {
    return null;
  }

  if (typeof details === "string") {
    return { text: details };
  }

  try {
    return JSON.parse(JSON.stringify(details));
  } catch {
    return { text: String(details) };
  }
}

/**
 * @param {object} input
 * @param {LogLevel} input.level
 * @param {LogCategory} input.category
 * @param {string} input.event
 * @param {string} input.message
 * @param {object|string|null} [input.details]
 * @param {string|null} [input.deviceSerial]
 * @param {string|null} [input.deviceName]
 */
export function logAppEvent({
  level,
  category,
  event,
  message,
  details = null,
  deviceSerial = null,
  deviceName = null,
}) {
  const timestamp = new Date();
  const entry = {
    id: nextId++,
    timestamp: timestamp.toISOString(),
    displayTime: formatDisplayTime(timestamp),
    level,
    category,
    event,
    message,
    details: normalizeDetails(details),
    deviceSerial,
    deviceName,
  };

  state.entries.unshift(entry);

  if (state.entries.length > MAX_ENTRIES) {
    state.entries.length = MAX_ENTRIES;
  }

  void persistLogEntry(entry);

  return entry;
}

export function logDebug(category, event, message, options = {}) {
  return logAppEvent({ level: "debug", category, event, message, ...options });
}

export function logInfo(category, event, message, options = {}) {
  return logAppEvent({ level: "info", category, event, message, ...options });
}

export function logWarn(category, event, message, options = {}) {
  return logAppEvent({ level: "warn", category, event, message, ...options });
}

export function logError(category, event, message, options = {}) {
  return logAppEvent({ level: "error", category, event, message, ...options });
}

export async function clearAppEventLog() {
  state.entries.length = 0;
  await clearAllPersistedLogs();
}

export function replaceAppEventLog(entries) {
  const nextEntries = Array.isArray(entries) ? [...entries] : [];
  state.entries.splice(0, state.entries.length, ...nextEntries);
  replaceCachedLogs(nextEntries);
  const maxId = nextEntries.reduce((max, entry) => Math.max(max, Number(entry?.id) || 0), 0);
  nextId = Math.max(nextId, maxId + 1);
}

export function getAppEventLogState() {
  return readonly(state);
}

export function getAppEventLogEntries() {
  return state.entries;
}
