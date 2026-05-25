import http from "node:http";

import { APP_VERSION } from "./config/version.js";
import { listDevices } from "./services/adb-service.js";
import { sendJson } from "./utils/http.js";

export function createApp() {
  return http.createServer(async (req, res) => {
    const { method, url } = req;
    const requestUrl = new URL(url ?? "/", "http://127.0.0.1");
    const { pathname } = requestUrl;

    if (method === "GET" && pathname === "/health") {
      sendJson(res, 200, {
        status: "ok",
        service: "cloud-phone-node",
        version: APP_VERSION,
      });
      return;
    }

    if (method === "GET" && pathname === "/") {
      sendJson(res, 200, {
        name: "cloud-phone-node",
        version: APP_VERSION,
        message: "Cloud Phone backend is ready.",
      });
      return;
    }

    if (method === "GET" && pathname === "/api/devices") {
      try {
        const { adbPath, devices } = await listDevices();

        sendJson(res, 200, {
          success: true,
          version: APP_VERSION,
          adbPath,
          total: devices.length,
          devices,
        });
      } catch (error) {
        sendJson(res, 500, {
          success: false,
          version: APP_VERSION,
          error: "Failed to query devices.",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
      return;
    }

    sendJson(res, 404, {
      error: "Not Found",
    });
  });
}
