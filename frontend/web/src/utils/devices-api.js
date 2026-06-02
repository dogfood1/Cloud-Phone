import { requestJson } from "./api.js";

export async function disconnectWirelessDevice(serial) {
  return requestJson(`/api/devices/${encodeURIComponent(serial)}`, {
    method: "DELETE",
  });
}
