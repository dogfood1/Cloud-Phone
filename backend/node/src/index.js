import { serverConfig } from "./config/env.js";
import { createApp } from "./app.js";
import { APP_VERSION } from "./config/version.js";
import { getHostNetworkSummary } from "./utils/host-networks.js";
import { startMdnsService } from "./services/mdns-service.js";
import { reconcileRedroidInstanceProxies } from "./services/redroid-service.js";
import { setupDeviceWebSocket } from "./ws/device-websocket-server.js";

const { host, backendPort } = serverConfig;

const server = createApp();
setupDeviceWebSocket(server);
let stopMdns = async () => {};
let proxyReconcileTimer = null;
let proxyReconcileRunning = false;

async function reconcileProxies() {
  if (proxyReconcileRunning) {
    return;
  }
  proxyReconcileRunning = true;
  try {
    const results = await reconcileRedroidInstanceProxies();
    const failures = results.filter((result) => !result.ok);
    if (failures.length) {
      console.error("[backend] proxy reconciliation failed:", failures);
    }
  } catch (error) {
    console.error("[backend] proxy reconciliation failed:", error);
  } finally {
    proxyReconcileRunning = false;
  }
}

process.on("unhandledRejection", (reason) => {
  console.error("[backend] unhandledRejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[backend] uncaughtException:", error);
});

server.listen(backendPort, host, () => {
  console.log(`Cloud Phone backend API listening on http://${host}:${backendPort}`);
  if (host === "0.0.0.0" || host === "::") {
    console.log(`LAN access: http://<your-ip>:${backendPort}`);
  }
  stopMdns = startMdnsService({
    host,
    port: backendPort,
    version: APP_VERSION,
    lanIpv4Addresses: getHostNetworkSummary(host).lanIpv4Addresses,
  });
  void reconcileProxies();
  proxyReconcileTimer = setInterval(reconcileProxies, 30_000);
  proxyReconcileTimer.unref();
  console.log("Start frontend: cd frontend/web && npm run dev");
});

async function shutdown(signal) {
  console.log(`[backend] received ${signal}, shutting down...`);
  if (proxyReconcileTimer) {
    clearInterval(proxyReconcileTimer);
    proxyReconcileTimer = null;
  }
  await stopMdns();
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});
