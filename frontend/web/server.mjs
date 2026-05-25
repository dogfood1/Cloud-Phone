import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { applyProjectEnv } from "../../tools/env-loader.js";

const currentDirPath = path.dirname(fileURLToPath(import.meta.url));
const webRootPath = currentDirPath;
const { host, backendPort, frontendPort, backendOrigin } = applyProjectEnv();

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url ?? "/", `http://127.0.0.1:${frontendPort}`);
  const { pathname } = requestUrl;

  if (pathname.startsWith("/api/")) {
    await proxyToBackend(req, res, requestUrl);
    return;
  }

  await serveStaticFile(pathname, res);
});

server.listen(frontendPort, host, () => {
  console.log(`Cloud Phone frontend: http://127.0.0.1:${frontendPort}`);
  console.log(`API proxy /api/* -> ${backendOrigin}`);
});

async function serveStaticFile(pathname, res) {
  const requestPath = pathname === "/" ? "/index.html" : pathname;

  try {
    const normalizedPath = path.resolve(webRootPath, `.${requestPath}`);

    if (!normalizedPath.startsWith(webRootPath)) {
      sendText(res, 403, "Forbidden");
      return;
    }

    if (!fs.existsSync(normalizedPath) || fs.statSync(normalizedPath).isDirectory()) {
      sendText(res, 404, "Not Found");
      return;
    }

    const extension = path.extname(normalizedPath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": contentTypes[extension] ?? "application/octet-stream",
    });
    res.end(fs.readFileSync(normalizedPath));
  } catch {
    sendText(res, 500, "Internal Server Error");
  }
}

async function proxyToBackend(clientReq, clientRes, requestUrl) {
  const headers = { ...clientReq.headers, host: `127.0.0.1:${backendPort}` };
  const proxyReq = http.request(
    `${backendOrigin}${requestUrl.pathname}${requestUrl.search}`,
    {
      method: clientReq.method,
      headers,
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
