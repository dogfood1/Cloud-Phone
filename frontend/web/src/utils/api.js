import {
  base64ToKey,
  decryptPayload,
  deriveLoginResponseKey,
  encryptPayload,
} from "./api-crypto.js";
import {
  clearSessionEncryptionKey,
  getSessionEncryptionKey,
  hasSessionEncryptionKey,
  saveSessionEncryptionKey,
} from "./api-session.js";

export { clearSessionEncryptionKey, hasSessionEncryptionKey, saveSessionEncryptionKey };

async function parseResponseBody(response) {
  const envelope = await response.json();

  if (!envelope?.encrypted) {
    return envelope;
  }

  const sessionKey = getSessionEncryptionKey();

  if (!sessionKey) {
    throw new Error("缺少会话加密密钥，请重新登录。");
  }

  return decryptPayload(envelope, base64ToKey(sessionKey));
}

async function buildRequestBody(body, options = {}) {
  if (!body) {
    return undefined;
  }

  if (options.plainJson) {
    return JSON.stringify(body);
  }

  const sessionKey = getSessionEncryptionKey();

  if (!sessionKey) {
    throw new Error("缺少会话加密密钥，请重新登录。");
  }

  const envelope = await encryptPayload(body, base64ToKey(sessionKey));
  return JSON.stringify(envelope);
}

export async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    method: options.method ?? "GET",
    credentials: "include",
    signal: options.signal,
    headers: options.body
      ? {
          "Content-Type": "application/json",
          "X-Encrypted-Request": options.plainJson ? "0" : "1",
        }
      : {},
    body: await buildRequestBody(options.body, options),
  });

  let result = {};

  try {
    result = await parseResponseBody(response);
  } catch {
    throw new Error(
      response.ok
        ? "服务器返回了无效 JSON。"
        : `服务器错误 (${response.status})，请确认后端已启动且无崩溃。`,
    );
  }

  if (!response.ok || result.success === false) {
    throw new Error(result.message ?? result.error ?? "Request failed.");
  }

  return result;
}

export async function loginRequest(password) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  const envelope = await response.json();

  if (!response.ok) {
    throw new Error(envelope.message ?? envelope.error ?? "Login failed.");
  }

  if (!envelope?.encrypted) {
    throw new Error("登录响应未加密。");
  }

  const loginKey = await deriveLoginResponseKey(password);
  const result = await decryptPayload(envelope, loginKey);

  if (result.encryptionKey) {
    saveSessionEncryptionKey(result.encryptionKey);
  }

  return result;
}

export async function parseEncryptedFetchResponse(response) {
  const envelope = await response.json();

  if (!envelope?.encrypted) {
    return envelope;
  }

  const sessionKey = getSessionEncryptionKey();

  if (!sessionKey) {
    throw new Error("缺少会话加密密钥，请重新登录。");
  }

  return decryptPayload(envelope, base64ToKey(sessionKey));
}

export async function changePasswordRequest(body) {
  const hasKey = hasSessionEncryptionKey();
  const response = await fetch("/api/auth/change-password", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: hasKey
      ? JSON.stringify(await encryptPayload(body, base64ToKey(getSessionEncryptionKey())))
      : JSON.stringify(body),
  });

  const envelope = await response.json();

  if (!response.ok) {
    const message = envelope.message ?? envelope.error ?? "Password change failed.";

    if (envelope?.encrypted && !hasKey) {
      const loginKey = await deriveLoginResponseKey(body.currentPassword);
      const decrypted = await decryptPayload(envelope, loginKey);
      throw new Error(decrypted.message ?? message);
    }

    throw new Error(message);
  }

  if (!envelope?.encrypted) {
    return envelope;
  }

  if (hasKey) {
    const result = await decryptPayload(envelope, base64ToKey(getSessionEncryptionKey()));
    if (result.encryptionKey) {
      saveSessionEncryptionKey(result.encryptionKey);
    }
    return result;
  }

  const loginKey = await deriveLoginResponseKey(body.currentPassword);
  const result = await decryptPayload(envelope, loginKey);

  if (result.encryptionKey) {
    saveSessionEncryptionKey(result.encryptionKey);
  }

  return result;
}

export async function fetchEncryptedBinary(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
  });

  const result = await parseResponseBody(response);

  if (!response.ok || result.success === false) {
    throw new Error(result.message ?? result.error ?? "Request failed.");
  }

  if (!result.data) {
    throw new Error("缺少加密文件数据。");
  }

  const bytes = Uint8Array.from(atob(result.data), (char) => char.charCodeAt(0));
  const mime = result.contentType ?? options.mime ?? "application/octet-stream";
  return new Blob([bytes], { type: mime });
}

export function getErrorMessage(error, fallback) {
  if (error instanceof TypeError) {
    return "无法连接后端 API，请先启动后端（根目录 npm run dev 或 npm run dev:backend）。";
  }

  return error instanceof Error ? error.message : fallback;
}
