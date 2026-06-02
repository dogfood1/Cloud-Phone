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

export function deviceSupportsDisconnect(device) {
  if (!device) {
    return false;
  }

  if (typeof device.wireless === "boolean") {
    return device.wireless;
  }

  return isWirelessAdbSerial(device.serial);
}
