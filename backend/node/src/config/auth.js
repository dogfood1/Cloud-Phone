export const AUTH_COOKIE_NAME = "cloud_phone_session";
/** ~5 months; cookie + signed token share this TTL. */
export const AUTH_SESSION_DURATION_DAYS = 150;
export const AUTH_SESSION_DURATION_MS = AUTH_SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;
export const DEFAULT_PASSWORD = "admin";
export const PASSWORD_MIN_LENGTH = 6;
