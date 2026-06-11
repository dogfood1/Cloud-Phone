function log(level, serial, event, payload) {
  const suffix = payload ? ` ${JSON.stringify(payload)}` : "";
  console[level](`[harmony-cast] ${event} serial=${serial}${suffix}`);
}

export function logHarmonyCastInfo(serial, event, payload) {
  log("log", serial, event, payload);
}

export function logHarmonyCastWarn(serial, event, payload) {
  log("warn", serial, event, payload);
}

export function logHarmonyCastError(serial, event, payload) {
  log("error", serial, event, payload);
}
