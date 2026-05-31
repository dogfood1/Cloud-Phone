/** Client-visible cast startup timeline (returned in cast/start & cast/status). */

export function appendCastStartupLog(session, message) {
  if (!session || !message) {
    return;
  }

  if (!Array.isArray(session.startupLogs)) {
    session.startupLogs = [];
  }

  session.startupLogs.push({
    ts: Date.now(),
    message: String(message),
  });
}

export function getCastStartupLogs(session) {
  return Array.isArray(session?.startupLogs) ? session.startupLogs : [];
}
