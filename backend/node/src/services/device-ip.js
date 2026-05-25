import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const IP_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;

export async function getDeviceIpAddress(adbPath, serial) {
  const probes = [
    ["shell", "ip", "-4", "addr", "show", "wlan0"],
    ["shell", "ip", "-4", "addr", "show", "eth0"],
    ["shell", "getprop", "dhcp.wlan0.ipaddress"],
    ["shell", "getprop", "dhcp.eth0.ipaddress"],
  ];

  for (const args of probes) {
    const ip = await readIpFromCommand(adbPath, serial, args);
    if (ip) {
      return ip;
    }
  }

  return null;
}

async function readIpFromCommand(adbPath, serial, args) {
  try {
    const { stdout } = await execFileAsync(adbPath, ["-s", serial, ...args], {
      windowsHide: true,
      timeout: 4000,
      maxBuffer: 256 * 1024,
    });

    return extractIp(stdout);
  } catch {
    return null;
  }
}

function extractIp(stdout) {
  const trimmed = stdout.trim();

  if (!trimmed || trimmed === "0.0.0.0") {
    return null;
  }

  if (!trimmed.includes("/") && IP_PATTERN.test(trimmed)) {
    return trimmed.match(IP_PATTERN)[0];
  }

  const inetMatch = trimmed.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);

  if (inetMatch?.[1] && inetMatch[1] !== "0.0.0.0") {
    return inetMatch[1];
  }

  const genericMatch = trimmed.match(IP_PATTERN);
  return genericMatch?.[0] && genericMatch[0] !== "0.0.0.0" ? genericMatch[0] : null;
}
