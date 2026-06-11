export function appendHarmonyStartupLog(session, message) {
  if (!session) {
    return;
  }

  if (!Array.isArray(session.startupLogs)) {
    session.startupLogs = [];
  }

  session.startupLogs.push({
    at: Date.now(),
    message,
  });
}

export function getHarmonyStartupLogs(session) {
  return session?.startupLogs ?? [];
}
