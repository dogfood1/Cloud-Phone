import { requestJson } from "./api.js";

export function startDeviceCast(serial, options = {}) {
  return requestJson(`/api/devices/${encodeURIComponent(serial)}/cast/start`, {
    method: "POST",
    body: options,
  });
}

export function stopDeviceCast(serial) {
  return requestJson(`/api/devices/${encodeURIComponent(serial)}/cast/stop`, {
    method: "DELETE",
  });
}
