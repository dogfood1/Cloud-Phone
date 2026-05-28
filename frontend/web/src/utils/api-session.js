const STORAGE_KEY = "cloud-phone-api-session-key";

export function saveSessionEncryptionKey(base64Key) {
  if (!base64Key) {
    clearSessionEncryptionKey();
    return;
  }

  sessionStorage.setItem(STORAGE_KEY, base64Key);
}

export function getSessionEncryptionKey() {
  return sessionStorage.getItem(STORAGE_KEY);
}

export function clearSessionEncryptionKey() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function hasSessionEncryptionKey() {
  return Boolean(getSessionEncryptionKey());
}
