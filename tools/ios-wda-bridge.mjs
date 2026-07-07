#!/usr/bin/env node
/**
 * Mac-side WDA mDNS bridge for Cloud Phone.
 *
 * Prerequisites on Intel Mac:
 * 1. iPhone USB connected, Developer Mode on, trusted.
 * 2. WebDriverAgentRunner running in Xcode (or xcodebuild test).
 * 3. Port forward (in separate terminals):
 *      iproxy 8100 8100
 *      iproxy 9100 9100
 *
 * Usage:
 *   node tools/ios-wda-bridge.mjs
 *   node tools/ios-wda-bridge.mjs --http-port 8100 --mjpeg-port 9100
 */

import os from "node:os";

const args = process.argv.slice(2);

function readArg(name, fallback) {
  const index = args.indexOf(name);

  if (index >= 0 && args[index + 1]) {
    return args[index + 1];
  }

  return fallback;
}

function pickLanIpv4() {
  const interfaces = os.networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        return entry.address;
      }
    }
  }

  return "127.0.0.1";
}

async function probeWda(httpPort) {
  const response = await fetch(`http://127.0.0.1:${httpPort}/status`, {
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`WDA /status failed (${response.status})`);
  }

  return response.json();
}

async function fetchDeviceInfo(httpPort) {
  const response = await fetch(`http://127.0.0.1:${httpPort}/wda/device/info`, {
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    return {};
  }

  const payload = await response.json();
  return payload?.value ?? payload ?? {};
}

async function main() {
  const httpPort = Number(readArg("--http-port", process.env.WDA_HTTP_PORT ?? "8100"));
  const mjpegPort = Number(readArg("--mjpeg-port", process.env.WDA_MJPEG_PORT ?? "9100"));
  const lanIpv4 = readArg("--lan", pickLanIpv4());

  console.log("[ios-wda-bridge] Probing local WDA...");
  await probeWda(httpPort);
  const info = await fetchDeviceInfo(httpPort);
  const udid = info?.udid || "unknown";
  const deviceName = info?.name || info?.model || "iPhone";

  const { startIosWdaMdnsBroadcast } = await import(
    "../backend/node/src/services/ios/ios-mdns.js"
  );

  const stop = startIosWdaMdnsBroadcast({
    host: "0.0.0.0",
    serviceName: `WDA-${String(udid).slice(-6)}`,
    bridgePort: httpPort,
    lanIpv4,
    txt: {
      http_port: String(httpPort),
      mjpeg_port: String(mjpegPort),
      udid,
      device_name: deviceName,
      model: info?.model || "",
      ios_version: info?.os?.version || "",
      bridge_host: lanIpv4,
    },
  });

  console.log("");
  console.log("Cloud Phone iOS bridge is broadcasting on LAN:");
  console.log(`  Service : _cloudphone-wda._tcp`);
  console.log(`  Host    : ${lanIpv4}`);
  console.log(`  WDA HTTP: ${httpPort}   MJPEG: ${mjpegPort}`);
  console.log(`  Device  : ${deviceName} (${udid})`);
  console.log("");
  console.log("On Windows, open Cloud Phone → Add Device → Apple → Scan LAN.");
  console.log("Press Ctrl+C to stop.");

  const shutdown = async () => {
    await stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("[ios-wda-bridge] Failed:", error instanceof Error ? error.message : error);
  console.error("");
  console.error("Checklist:");
  console.error("  • WDA WebDriverAgentRunner is running on the iPhone");
  console.error("  • iproxy 8100 8100  and  iproxy 9100 9100  are active");
  console.error("  • iPhone and Windows PC are on the same LAN as this Mac");
  process.exit(1);
});
