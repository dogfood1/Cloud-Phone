import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { applyProjectEnv } from "../../tools/env-loader.js";
import { createSelfSignedTlsOptions } from "./tls-self-signed.mjs";
import { attachApiWebSocketProxy } from "./ws-proxy.mjs";

const currentDirPath = path.dirname(fileURLToPath(import.meta.url));
const distRootPath = path.resolve(currentDirPath, "dist");
const {
  host,
  frontendPort,
  backendOrigin,
  frontendHttps,
  frontendTlsSans,
} = applyProjectEnv();

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

if (!fs.existsSync(distRootPath)) {
  console.error("Missing frontend build output. Run: cd frontend/web && npm run build");
  process.exit(1);
}

const requestListener = async (req, res) => {
  const requestScheme = frontendHttps ? "https" : "http";
  const requestUrl = new URL(req.url ?? "/", `${requestScheme}://127.0.0.1:${frontendPort}`);
  const { pathname } = requestUrl;

  if (pathname.startsWith("/api/")) {
    await proxyToBackend(req, res, requestUrl);
    return;
  }

  await serveStaticFile(pathname, res);
};

const tlsOptions = frontendHttps ? await createSelfSignedTlsOptions(frontendTlsSans) : null;
const server = tlsOptions
  ? https.createServer(tlsOptions, requestListener)
  : http.createServer(requestListener);

server.listen(frontendPort, host, () => {
  const scheme = frontendHttps ? "https" : "http";
  console.log(`Cloud Phone frontend: ${scheme}://127.0.0.1:${frontendPort}`);
  console.log("Serving build from dist/");

  if (frontendHttps) {
    console.log("Self-signed TLS enabled (accept browser warning on first visit).");
    if (frontendTlsSans.length > 0) {
      console.log(`TLS SAN: ${frontendTlsSans.join(", ")}`);
    }
  }

  console.log(`API proxy /api/* -> ${backendOrigin}`);
  console.log("WebSocket proxy /api/* -> backend enabled");
});

attachApiWebSocketProxy(server, {
  backendOrigin,
  frontendPort,
  frontendHttps,
});

async function serveStaticFile(pathname, res) {
  const requestPath = pathname === "/" ? "/index.html" : pathname;

  try {
    const normalizedPath = path.resolve(distRootPath, `.${requestPath}`);

    if (!normalizedPath.startsWith(distRootPath)) {
      sendText(res, 403, "Forbidden");
      return;
    }

    let filePath = normalizedPath;

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distRootPath, "index.html");
    }

    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": contentTypes[extension] ?? "application/octet-stream",
    });
    res.end(fs.readFileSync(filePath));
  } catch {
    sendText(res, 500, "Internal Server Error");
  }
}

async function proxyToBackend(clientReq, clientRes, requestUrl) {
  const backendUrl = new URL(backendOrigin);
  const headers = { ...clientReq.headers, host: backendUrl.host };
  const proxyReq = http.request(
    `${backendOrigin}${requestUrl.pathname}${requestUrl.search}`,
    {
      method: clientReq.method,
      headers,
      timeout: 0,
    },
    (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(clientRes);
    },
  );

  proxyReq.on("error", () => {
    sendText(clientRes, 502, `Backend unavailable at ${backendOrigin}`);
  });

  clientReq.pipe(proxyReq);
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(message);
}
