import { requestJson } from "./api.js";

export function startDeviceCast(serial, options = {}) {
  return requestJson(`/api/devices/${encodeURIComponent(serial)}/cast/start`, {
    method: "POST",
    body: options,
  });
}

export function stopDeviceCast(serial, options = {}) {
  const sessionKey = options.sessionKey ? String(options.sessionKey) : "";
  const query = sessionKey
    ? `?sessionKey=${encodeURIComponent(sessionKey)}`
    : "";
  return requestJson(`/api/devices/${encodeURIComponent(serial)}/cast/stop${query}`, {
    method: "DELETE",
    signal: options.signal,
  });
}

export function getDeviceCastStatus(serial) {
  return requestJson(`/api/devices/${encodeURIComponent(serial)}/cast/status`, {
    method: "GET",
  });
}
