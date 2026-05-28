import { serverConfig } from "../config/env.js";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
};

export function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.writeHead(statusCode, {
    ...JSON_HEADERS,
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

export function sendEmpty(res, statusCode, extraHeaders = {}) {
  res.writeHead(statusCode, extraHeaders);
  res.end();
}

export function sendBuffer(res, statusCode, buffer, contentType, extraHeaders = {}) {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Content-Length": buffer.length,
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  res.end(buffer);
}

export async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const body = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(body);
}

export function applyCors(req, res) {
  const origin = req.headers.origin;

  if (!origin || !isAllowedOrigin(origin)) {
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Encrypted-Request");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Vary", "Origin");
}

function isAllowedOrigin(origin) {
  const allowedOrigins = new Set([
    serverConfig.frontendOrigin,
    `http://localhost:${serverConfig.frontendPort}`,
    `http://127.0.0.1:${serverConfig.frontendPort}`,
    `http://[::1]:${serverConfig.frontendPort}`,
  ]);

  return allowedOrigins.has(origin);
}
