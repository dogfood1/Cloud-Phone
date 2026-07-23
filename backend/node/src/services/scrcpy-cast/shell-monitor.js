import { logCastError, logCastInfo, logCastWarn, trimProcessOutput } from "./cast-logger.js";
import { deleteCastSession, getCastSession } from "./session-store.js";
import { logStreamStopped } from "./stream-stats.js";

export function attachShellMonitor(session) {
  const { serial, shellProcess } = session;

  if (!shellProcess) {
    return;
  }

  logCastInfo(serial, "server.shell.spawned", {
    pid: shellProcess.pid,
    socketName: session.socketName,
    localPort: session.localPort,
    scid: `0x${session.scid.toString(16)}`,
  });

  shellProcess.stdout?.on("data", (chunk) => {
    const output = trimProcessOutput(chunk);

    if (output) {
      if (/\bERROR\b/i.test(output)) {
        logCastError(serial, "server.stdout", { output });
      } else if (/\bWARN\b/i.test(output)) {
        logCastWarn(serial, "server.stdout", { output });
      } else {
        logCastInfo(serial, "server.stdout", { output });
      }
    }
  });

  shellProcess.stderr?.on("data", (chunk) => {
    const output = trimProcessOutput(chunk);

    if (output) {
      logCastWarn(serial, "server.stderr", { output });
    }
  });

  shellProcess.on("exit", (code, signal) => {
    // Web cast launches with nohup — the adb shell may exit while app_process keeps running.
    // Do not tear down the session on shell detach.
    if (session.webCast) {
      logCastInfo(serial, "server.shell.detached", {
        code,
        signal: signal ?? null,
        sessionKey: session.sessionKey,
        deviceWsPort: session.deviceWsPort ?? 8886,
      });
      session.shellDetached = true;
      session.shellProcess = null;
      return;
    }

    session.serverExited = true;
    session.serverExitCode = code;
    session.serverExitSignal = signal ?? null;

    logCastInfo(serial, "server.exited", {
      code,
      signal: signal ?? null,
      streaming: session.streaming,
      hadVideoSocket: Boolean(session.videoSocket),
    });

    if (session.streaming || session.videoSocket) {
      logStreamStopped(serial, session, "server_shell_exited");
    }

    session.stopping = true;

    for (const client of session.clients) {
      try {
        client.close(1011, "scrcpy server exited");
      } catch {
        // ignore
      }
    }

    session.clients.clear();

    if (getCastSession(session.sessionKey || serial) === session) {
      deleteCastSession(session.sessionKey || serial);
    }
  });

  shellProcess.on("error", (error) => {
    logCastError(serial, "server.shell.error", {
      message: error.message,
    });
  });
}
