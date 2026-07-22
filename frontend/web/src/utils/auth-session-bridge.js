let sessionExpiredHandler = null;
let sessionExpiredPending = false;

export function registerSessionExpiredHandler(handler) {
  sessionExpiredHandler = handler;
}

export function resetSessionExpiredGate() {
  sessionExpiredPending = false;
}

export function notifySessionExpired() {
  if (sessionExpiredPending || !sessionExpiredHandler) {
    return;
  }

  sessionExpiredPending = true;
  sessionExpiredHandler();
}
