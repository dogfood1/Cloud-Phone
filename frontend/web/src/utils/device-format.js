import { i18n } from "../i18n/index.js";

const KNOWN_STATES = new Set([
  "device",
  "offline",
  "unauthorized",
  "bootloader",
  "recovery",
  "sideload",
  "downloading",
  "no permissions",
]);

export function getDeviceStateLabel(state) {
  if (state && KNOWN_STATES.has(state)) {
    return i18n.global.t(`devices.state.${state}`);
  }

  return state ?? i18n.global.t("devices.state.unknown");
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
  const locale = i18n.global.locale.value;

  return [...devices].sort((left, right) => {
    if (left.connected !== right.connected) {
      return left.connected ? -1 : 1;
    }

    return String(left.displayName ?? left.serial).localeCompare(
      String(right.displayName ?? right.serial),
      locale,
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
    return i18n.global.t("devices.refreshNever");
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return i18n.global.t("common.dateUnknown");
  }

  return new Intl.DateTimeFormat(i18n.global.locale.value, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}
