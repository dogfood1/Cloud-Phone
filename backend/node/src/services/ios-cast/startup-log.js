export function appendIosStartupLog(session, message) {
  if (!session) {
    return;
  }

  const line = `[${new Date().toISOString()}] ${message}`;
  session.startupLogs.push(line);

  if (session.startupLogs.length > 200) {
    session.startupLogs.shift();
  }
}

export function getIosStartupLogs(session) {
  return session?.startupLogs ?? [];
}
