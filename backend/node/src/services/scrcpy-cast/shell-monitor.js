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

    if (getCastSession(serial) === session) {
      deleteCastSession(serial);
    }
  });

  shellProcess.on("error", (error) => {
    logCastError(serial, "server.shell.error", {
      message: error.message,
    });
  });
}
