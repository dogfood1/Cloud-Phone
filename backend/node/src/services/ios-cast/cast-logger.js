export function logIosCastInfo(serial, event, details = {}) {
  console.log(`[ios-cast:${serial}] ${event}`, details);
}

export function logIosCastError(serial, event, details = {}) {
  console.error(`[ios-cast:${serial}] ${event}`, details);
}
