/**
 * Wireless ADB devices appear as host:port serials from `adb connect`.
 * USB devices use hardware serials; emulators use emulator-* prefixes.
 */
export function isWirelessAdbSerial(serial) {
  if (!serial || typeof serial !== "string") {
    return false;
  }

  if (serial.startsWith("emulator-")) {
    return false;
  }

  const match = serial.match(/^(.+):(\d{1,5})$/);

  if (!match) {
    return false;
  }

  const port = Number.parseInt(match[2], 10);
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

export function withConnectionType(device) {
  return {
    ...device,
    wireless: isWirelessAdbSerial(device.serial),
  };
}
