import { requestJson } from "./api.js";

export async function fetchPublicPreferences() {
  const result = await requestJson("/api/public/preferences", {
    plainJson: true,
    skipAuthExpire: true,
    allowFailure: true,
  });
  return result?.preferences ?? {};
}

export async function savePublicPreferences(preferences) {
  const result = await requestJson("/api/public/preferences", {
    method: "POST",
    body: preferences,
    plainJson: true,
    skipAuthExpire: true,
    allowFailure: true,
  });
  return result?.preferences ?? {};
}

export async function fetchLocalPersistence(logLimit = 2000) {
  const result = await requestJson(`/api/local-persistence?logLimit=${encodeURIComponent(logLimit)}`);
  return {
    settings: result.settings ?? {},
    runtimeState: result.runtimeState ?? {},
    logs: Array.isArray(result.logs) ? result.logs : [],
  };
}

export async function saveLocalPersistencePatch(payload) {
  const result = await requestJson("/api/local-persistence", {
    method: "POST",
    body: payload,
  });
  return {
    settings: result.settings ?? {},
    runtimeState: result.runtimeState ?? {},
  };
}

export async function appendPersistedLog(entry) {
  await requestJson("/api/logs", {
    method: "POST",
    body: { entry },
    allowFailure: true,
  });
}

export async function clearPersistedLogs() {
  await requestJson("/api/logs", {
    method: "DELETE",
    allowFailure: true,
  });
}
