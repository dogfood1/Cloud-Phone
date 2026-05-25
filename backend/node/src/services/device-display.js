export function getDeviceDisplayName(device) {
  if (device.model) {
    return device.model;
  }

  if (device.manufacturer && device.product) {
    return `${device.manufacturer} ${device.product}`;
  }

  if (device.product) {
    return device.product;
  }

  return device.serial;
}
