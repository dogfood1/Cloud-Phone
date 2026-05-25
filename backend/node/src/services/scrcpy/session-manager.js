import { randomUUID } from "node:crypto";

import { startScrcpyProcess, stopScrcpyProcess } from "./runner.js";

const sessions = new Map();

export function listScrcpySessions() {
  return [...sessions.values()].map((session) => session.summary);
}

export async function createScrcpySession(options = {}) {
  const id = randomUUID();
  const handle = await startScrcpyProcess(options);
  const startedAt = new Date().toISOString();

  const summary = {
    id,
    pid: handle.pid,
    serial: options.serial ?? null,
    startedAt,
    args: handle.args,
    status: "running",
  };

  const session = {
    id,
    summary,
    handle,
  };

  handle.child.once("exit", (code, signal) => {
    summary.status = "stopped";
    summary.exitCode = code;
    summary.signal = signal;
    summary.stoppedAt = new Date().toISOString();
  });

  sessions.set(id, session);
  return summary;
}

export async function stopScrcpySession(sessionId) {
  const session = sessions.get(sessionId);

  if (!session) {
    return null;
  }

  await stopScrcpyProcess(session.handle);
  session.summary.status = "stopped";
  session.summary.stoppedAt = new Date().toISOString();
  sessions.delete(sessionId);
  return session.summary;
}

export function getScrcpySession(sessionId) {
  return sessions.get(sessionId)?.summary ?? null;
}
