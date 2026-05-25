const STATE_LABELS = {
  device: "在线",
  offline: "离线",
  unauthorized: "未授权",
  bootloader: "Bootloader",
  recovery: "Recovery",
  sideload: "侧载",
  downloading: "下载中",
  "no permissions": "无权限",
};

export function getDeviceStateLabel(state) {
  return STATE_LABELS[state] ?? state ?? "未知";
}

export function formatAndroidVersion(device) {
  if (device.androidVersion && device.sdkVersion) {
    return `Android ${device.androidVersion} · SDK ${device.sdkVersion}`;
  }

  if (device.androidVersion) {
    return `Android ${device.androidVersion}`;
  }

  if (device.sdkVersion) {
    return `SDK ${device.sdkVersion}`;
  }

  return null;
}

export function formatManufacturerLine(device) {
  if (device.manufacturer && device.product) {
    return `${device.manufacturer} · ${device.product}`;
  }

  if (device.manufacturer) {
    return device.manufacturer;
  }

  if (device.product) {
    return device.product;
  }

  return null;
}

export function sortDevices(devices) {
  return [...devices].sort((left, right) => {
    if (left.connected !== right.connected) {
      return left.connected ? -1 : 1;
    }

    return String(left.displayName ?? left.serial).localeCompare(
      String(right.displayName ?? right.serial),
      "zh-CN",
    );
  });
}

export function summarizeDevices(devices) {
  const online = devices.filter((device) => device.connected).length;

  return {
    total: devices.length,
    online,
    offline: devices.length - online,
  };
}

export function formatRefreshTime(value) {
  if (!value) {
    return "尚未刷新";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "未知时间";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}
