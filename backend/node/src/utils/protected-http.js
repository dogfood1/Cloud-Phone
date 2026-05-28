import {
  decryptPayload,
  encryptPayload,
  derivePasswordEnvelopeKey,
} from "./api-crypto.js";
import { readJsonBody, sendBuffer, sendJson } from "./http.js";

export function attachResponseEncryption(res, encryptionKey) {
  res.apiEncryptionKey = encryptionKey;
}

export function sendProtectedJson(res, statusCode, payload, extraHeaders = {}) {
  const key = res.apiEncryptionKey;

  if (!key) {
    sendJson(res, statusCode, payload, extraHeaders);
    return;
  }

  sendJson(res, statusCode, encryptPayload(payload, key), extraHeaders);
}

export function sendPasswordProtectedJson(res, statusCode, payload, password, extraHeaders = {}) {
  const key = derivePasswordEnvelopeKey(password, "login-response-v1");
  sendJson(res, statusCode, encryptPayload(payload, key), extraHeaders);
}

export async function readProtectedJsonBody(req, res) {
  const raw = await readJsonBody(req);
  const key = res?.apiEncryptionKey;

  if (!key) {
    return raw;
  }

  if (!raw?.encrypted) {
    throw new Error("encrypted_body_required");
  }

  return decryptPayload(raw, key);
}

export async function readOptionalProtectedJsonBody(req, res) {
  const raw = await readJsonBody(req);

  if (!res.apiEncryptionKey) {
    return raw;
  }

  if (!raw?.encrypted) {
    return raw;
  }

  return decryptPayload(raw, res.apiEncryptionKey);
}

export function sendProtectedBuffer(res, statusCode, buffer, contentType, extraHeaders = {}) {
  const key = res.apiEncryptionKey;

  if (!key) {
    sendBuffer(res, statusCode, buffer, contentType, extraHeaders);
    return;
  }

  sendProtectedJson(
    res,
    statusCode,
    {
      success: true,
      contentType,
      data: buffer.toString("base64"),
    },
    extraHeaders,
  );
}
