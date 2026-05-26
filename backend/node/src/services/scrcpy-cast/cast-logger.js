const LOG_PREFIX = "[scrcpy-cast]";

function formatDetails(details) {
  if (!details || Object.keys(details).length === 0) {
    return "";
  }

  try {
    return ` ${JSON.stringify(details)}`;
  } catch {
    return " [details-unserializable]";
  }
}

export function logCast(level, serial, event, details = {}) {
  const tag = serial ? `${serial}` : "-";
  const line = `${LOG_PREFIX} ${event} serial=${tag}${formatDetails(details)}`;

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function logCastInfo(serial, event, details) {
  logCast("info", serial, event, details);
}

export function logCastWarn(serial, event, details) {
  logCast("warn", serial, event, details);
}

export function logCastError(serial, event, details) {
  logCast("error", serial, event, details);
}

export function trimProcessOutput(buffer) {
  const text = Buffer.isBuffer(buffer) ? buffer.toString("utf8") : String(buffer);
  const trimmed = text.trim();

  if (!trimmed) {
    return "";
  }

  return trimmed.length > 500 ? `${trimmed.slice(0, 500)}…` : trimmed;
}
