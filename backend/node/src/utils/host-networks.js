import fs from "node:fs";
import os from "node:os";

function isIpv4InCidr(ip, prefix, bits) {
  const a = ip.split(".").map((n) => Number(n));
  const b = prefix.split(".").map((n) => Number(n));

  if (a.length !== 4 || b.length !== 4 || a.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }

  const toInt = (p) => ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (toInt(a) & mask) === (toInt(b) & mask);
}

function isPreferredLanIpv4(ip) {
  if (isIpv4InCidr(ip, "192.168.0.0", 16)) return true;
  if (isIpv4InCidr(ip, "10.0.0.0", 8)) return true;
  if (isIpv4InCidr(ip, "172.16.0.0", 12)) return true;
  return false;
}

function isExcludedIpv4(ip) {
  if (isIpv4InCidr(ip, "127.0.0.0", 8)) return true;
  if (isIpv4InCidr(ip, "169.254.0.0", 16)) return true;
  if (isIpv4InCidr(ip, "198.18.0.0", 15)) return true;
  return false;
}

export function getHostNetworkScope() {
  if (process.env.CLOUD_PHONE_NETWORK_SCOPE === "host") {
    return "host";
  }

  if (process.env.CLOUD_PHONE_NETWORK_SCOPE === "container") {
    return "container";
  }

  if (fs.existsSync("/.dockerenv") && process.env.CLOUD_PHONE_USE_HOST_NETWORK !== "1") {
    return "container";
  }

  return "host";
}

export function listHostNetworkInterfaces() {
  const interfaces = [];

  for (const [name, items] of Object.entries(os.networkInterfaces())) {
    for (const item of items ?? []) {
      if (!item?.address) {
        continue;
      }

      interfaces.push({
        name,
        family: item.family,
        address: item.address,
        netmask: item.netmask ?? null,
        mac: item.mac ?? null,
        internal: Boolean(item.internal),
        cidr: item.cidr ?? null,
        scope: item.scope ?? null,
      });
    }
  }

  return interfaces;
}

export function pickLanIpv4(hostHint) {
  const forced = process.env.CLOUD_PHONE_LAN_IP?.trim();
  if (forced) {
    return forced;
  }

  if (hostHint && hostHint !== "0.0.0.0" && hostHint !== "::" && hostHint !== "127.0.0.1") {
    return hostHint;
  }

  const candidates = listHostNetworkInterfaces()
    .filter((item) => item.family === "IPv4" && !item.internal)
    .map((item) => item.address)
    .filter((ip) => !isExcludedIpv4(ip));

  const preferred = candidates.find(isPreferredLanIpv4);
  if (preferred) {
    return preferred;
  }

  return candidates[0] ?? "127.0.0.1";
}

export function getHostNetworkSummary(hostHint) {
  const interfaces = listHostNetworkInterfaces();
  const primaryLanIpv4 = pickLanIpv4(hostHint);
  const lanIpv4Addresses = interfaces
    .filter((item) => item.family === "IPv4" && !item.internal)
    .map((item) => item.address)
    .filter((ip) => !isExcludedIpv4(ip));

  return {
    scope: getHostNetworkScope(),
    primaryLanIpv4,
    lanIpv4Addresses,
    interfaces: interfaces.map((item) => ({
      ...item,
      recommended: item.family === "IPv4" && item.address === primaryLanIpv4,
    })),
  };
}
