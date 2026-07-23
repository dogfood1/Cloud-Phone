/** Session map key helpers (shared web cast uses serial as the key). */

export function makeSessionKey(serial, windowId) {
  const id = String(windowId || "").trim();
  if (!id) {
    return serial;
  }
  return `${serial}::${id}`;
}

/**
 * Pick a device-side WebSocket listen port (default shared web cast uses 8886).
 * @param {string} windowId
 * @param {number[]} [usedPorts]
 */
export function pickDeviceWsPort(windowId, usedPorts = []) {
  const used = new Set(usedPorts.filter((p) => Number.isFinite(p)));
  used.add(8886);
  let hash = 0;
  const text = String(windowId || "win");
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 33 + text.charCodeAt(i)) >>> 0;
  }
  for (let i = 0; i < 900; i += 1) {
    const port = 8887 + ((hash + i) % 900);
    if (!used.has(port)) {
      return port;
    }
  }
  return 8887 + (hash % 900);
}
