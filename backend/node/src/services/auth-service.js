import crypto from "node:crypto";

import {
  AUTH_COOKIE_NAME,
  AUTH_SESSION_DURATION_HOURS,
  DEFAULT_PASSWORD,
  PASSWORD_MIN_LENGTH,
} from "../config/auth.js";
import { createSessionEncryptionKey } from "../utils/api-crypto.js";
import { getAuthKeyMaterial, getPasswordRecord, savePasswordRecord } from "./auth-store.js";
import { getSessionRecord, registerSession, removeSession } from "./session-store.js";

const SESSION_SECRET_CONTEXT = "cloud-phone-session";

export async function getAuthStatus(sessionToken) {
  const passwordRecord = getPasswordRecord();
  const session = verifySessionTokenInternal(sessionToken);
  const hasActiveSession = Boolean(session && getSessionRecord(sessionToken));

  if (!hasActiveSession) {
    removeSession(sessionToken);
  }

  return {
    authenticated: hasActiveSession,
    passwordConfigured: Boolean(passwordRecord),
    // Only prompt for password change after the default password was verified via login.
    requiresPasswordChange: !passwordRecord && hasActiveSession,
    sessionExpiresAt: hasActiveSession ? session?.expiresAt ?? null : null,
    passwordUpdatedAt: passwordRecord?.updatedAt ?? null,
  };
}

export async function loginWithPassword(password) {
  const passwordRecord = getPasswordRecord();
  const matches = passwordRecord
    ? await verifyPasswordAgainstRecord(password, passwordRecord)
    : password === DEFAULT_PASSWORD;

  if (!matches) {
    return {
      success: false,
      code: "INVALID_PASSWORD",
      message: "Password is incorrect.",
    };
  }

  if (!passwordRecord) {
    return {
      success: true,
      authenticated: false,
      requiresPasswordChange: true,
      passwordConfigured: false,
      message: "Default password must be changed before continuing.",
    };
  }

  const session = createSessionToken();

  return {
    success: true,
    authenticated: true,
    requiresPasswordChange: false,
    passwordConfigured: true,
    session,
  };
}

export async function changePassword(currentPassword, nextPassword) {
  const passwordRecord = getPasswordRecord();
  const currentPasswordMatches = passwordRecord
    ? await verifyPasswordAgainstRecord(currentPassword, passwordRecord)
    : currentPassword === DEFAULT_PASSWORD;

  if (!currentPasswordMatches) {
    return {
      success: false,
      code: "INVALID_PASSWORD",
      message: "Current password is incorrect.",
    };
  }

  if (nextPassword.length < PASSWORD_MIN_LENGTH) {
    return {
      success: false,
      code: "PASSWORD_TOO_SHORT",
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    };
  }

  if (nextPassword === DEFAULT_PASSWORD) {
    return {
      success: false,
      code: "DEFAULT_PASSWORD_FORBIDDEN",
      message: "Default password cannot be reused.",
    };
  }

  const nextRecord = await createPasswordRecord(nextPassword);
  const savedRecord = savePasswordRecord(nextRecord);
  const session = createSessionToken();

  return {
    success: true,
    authenticated: true,
    requiresPasswordChange: false,
    passwordConfigured: true,
    passwordUpdatedAt: savedRecord.updatedAt,
    session,
  };
}

export function verifySessionToken(token) {
  return verifySessionTokenInternal(token);
}

export function revokeSessionToken(token) {
  removeSession(token);
}

export function getClearSessionCookie() {
  return serializeSessionCookie("", new Date(0));
}

export function getSessionCookie(token) {
  const expiresAt = new Date(Date.now() + AUTH_SESSION_DURATION_HOURS * 60 * 60 * 1000);
  return serializeSessionCookie(token, expiresAt);
}

function serializeSessionCookie(token, expiresAt) {
  return [
    `${AUTH_COOKIE_NAME}=${token}`,
    `Expires=${expiresAt.toUTCString()}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ].join("; ");
}

async function createPasswordRecord(password) {
  const salt = crypto.randomBytes(16).toString("base64");
  const hash = await derivePasswordHash(password, salt);

  return {
    algorithm: "scrypt",
    salt,
    hash,
  };
}

async function verifyPasswordAgainstRecord(password, record) {
  const derivedHash = await derivePasswordHash(password, record.salt);
  return crypto.timingSafeEqual(
    Buffer.from(derivedHash, "base64"),
    Buffer.from(record.hash, "base64"),
  );
}

async function derivePasswordHash(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey.toString("base64"));
    });
  });
}

function createSessionToken() {
  const expiresAt = new Date(Date.now() + AUTH_SESSION_DURATION_HOURS * 60 * 60 * 1000);
  const payload = Buffer.from(
    JSON.stringify({
      exp: expiresAt.toISOString(),
      iat: new Date().toISOString(),
    }),
    "utf8",
  ).toString("base64url");
  const signature = signPayload(payload);
  const token = `${payload}.${signature}`;
  const encryptionKey = createSessionEncryptionKey();

  registerSession(token, encryptionKey, expiresAt.toISOString());

  return {
    token,
    expiresAt: expiresAt.toISOString(),
    encryptionKey: encryptionKey.toString("base64"),
  };
}

function verifySessionTokenInternal(token) {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature || signPayload(payload) !== signature) {
    return null;
  }

  try {
    const parsedPayload = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const expiresAt = new Date(parsedPayload.exp);

    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      return null;
    }

    return {
      expiresAt: expiresAt.toISOString(),
    };
  } catch {
    return null;
  }
}

function signPayload(payload) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

function getSessionSecret() {
  return crypto
    .createHash("sha256")
    .update(Buffer.concat([Buffer.from(SESSION_SECRET_CONTEXT, "utf8"), getAuthKeyMaterial()]))
    .digest();
}
