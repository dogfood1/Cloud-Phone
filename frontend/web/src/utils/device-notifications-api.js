import { requestJson } from "./api.js";

export async function fetchDeviceNotifications(serial) {
  const result = await requestJson(`/api/devices/${encodeURIComponent(serial)}/notifications`);
  return result.notifications ?? [];
}
