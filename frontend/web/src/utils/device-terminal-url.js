export function buildDeviceTerminalWebSocketUrl(serial) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

  return `${protocol}//${window.location.host}/api/devices/${encodeURIComponent(serial)}/terminal/ws`;
}
