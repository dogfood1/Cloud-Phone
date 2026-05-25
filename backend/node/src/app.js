import http from "node:http";

import { AUTH_COOKIE_NAME } from "./config/auth.js";
import { APP_VERSION } from "./config/version.js";
import { listDevices } from "./services/adb-service.js";
import { captureDeviceScreenshot } from "./services/device-screenshot.js";
import {
  changePassword,
  getAuthStatus,
  getClearSessionCookie,
  getSessionCookie,
  loginWithPassword,
} from "./services/auth-service.js";
import { handleScrcpyRoute } from "./routes/scrcpy-routes.js";
import { parseCookies } from "./utils/cookies.js";
import { applyCors, readJsonBody, sendBuffer, sendEmpty, sendJson } from "./utils/http.js";

export function createApp() {
  return http.createServer(async (req, res) => {
    const { method, url } = req;
    const requestUrl = new URL(url ?? "/", "http://127.0.0.1");
    const { pathname } = requestUrl;
    const cookies = parseCookies(req.headers.cookie);

    applyCors(req, res);

    if (method === "OPTIONS") {
      sendEmpty(res, 204);
      return;
    }

    if (method === "GET" && pathname === "/health") {
      sendJson(res, 200, {
        status: "ok",
        service: "cloud-phone-node",
        version: APP_VERSION,
      });
      return;
    }

    if (method === "GET" && pathname === "/api/auth/session") {
      const authStatus = await getAuthStatus(cookies[AUTH_COOKIE_NAME]);

      sendJson(res, 200, {
        success: true,
        version: APP_VERSION,
        ...authStatus,
      });
      return;
    }

    if (method === "POST" && pathname === "/api/auth/login") {
      try {
        const body = await readJsonBody(req);
        const result = await loginWithPassword(String(body.password ?? ""));

        if (!result.success) {
          sendJson(res, 401, {
            success: false,
            version: APP_VERSION,
            code: result.code,
            message: result.message,
          });
          return;
        }

        const headers = result.session
          ? { "Set-Cookie": getSessionCookie(result.session.token) }
          : {};

        sendJson(
          res,
          200,
          {
            success: true,
            version: APP_VERSION,
            authenticated: result.authenticated,
            requiresPasswordChange: result.requiresPasswordChange,
            passwordConfigured: result.passwordConfigured,
            sessionExpiresAt: result.session?.expiresAt ?? null,
          },
          headers,
        );
      } catch (error) {
        sendJson(res, 400, {
          success: false,
          version: APP_VERSION,
          error: "Invalid request body.",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
      return;
    }

    if (method === "POST" && pathname === "/api/auth/change-password") {
      try {
        const body = await readJsonBody(req);
        const result = await changePassword(
          String(body.currentPassword ?? ""),
          String(body.nextPassword ?? ""),
        );

        if (!result.success) {
          sendJson(res, 400, {
            success: false,
            version: APP_VERSION,
            code: result.code,
            message: result.message,
          });
          return;
        }

        sendJson(
          res,
          200,
          {
            success: true,
            version: APP_VERSION,
            authenticated: true,
            requiresPasswordChange: false,
            passwordConfigured: true,
            sessionExpiresAt: result.session.expiresAt,
            passwordUpdatedAt: result.passwordUpdatedAt,
          },
          {
            "Set-Cookie": getSessionCookie(result.session.token),
          },
        );
      } catch (error) {
        sendJson(res, 400, {
          success: false,
          version: APP_VERSION,
          error: "Invalid request body.",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
      return;
    }

    if (method === "POST" && pathname === "/api/auth/logout") {
      sendJson(
        res,
        200,
        {
          success: true,
          version: APP_VERSION,
        },
        {
          "Set-Cookie": getClearSessionCookie(),
        },
      );
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

    if (await handleScrcpyRoute(req, res, method, pathname)) {
      return;
    }

    const screenshotMatch = pathname.match(/^\/api\/devices\/([^/]+)\/screenshot$/);

    if (method === "GET" && screenshotMatch) {
      const serial = decodeURIComponent(screenshotMatch[1]);

      try {
        const screenshot = await captureDeviceScreenshot(serial);
        sendBuffer(res, 200, screenshot, "image/png");
      } catch (error) {
        sendJson(res, 500, {
          success: false,
          version: APP_VERSION,
          error: "Failed to capture screenshot.",
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
