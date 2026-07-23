import { runAdb, spawnAdbShell } from "../adb-command.js";
import { logCastInfo } from "./cast-logger.js";
import { appendCastStartupLog } from "./startup-log.js";
import { buildServerShellCommand } from "./server-args.js";
import { attachShellMonitor } from "./shell-monitor.js";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ensureServerShell(session, options = {}) {
  if (session.shellProcess && !session.serverExited) {
    return session.shellProcess;
  }

  // Web cast already detached: server should still be listening on device :8886.
  if (session.webCast && session.shellDetached && !session.serverExited) {
    return null;
  }

  if (session.serverExited) {
    session.serverExited = false;
    session.serverExitCode = null;
    session.serverExitSignal = null;
  }

  session.shellDetached = false;
  const shellCommand = buildServerShellCommand(session.scid, {
    ...options,
    deviceWsPort: 8886,
  });

  // Single shared web server — clear leftover Server before spawn.
  try {
    await runAdb(["-s", session.serial, "shell", "pkill -f com.genymobile.scrcpy.Server"], {
      timeout: 5000,
    });
  } catch {
    // ignore
  }

  logCastInfo(session.serial, "server.shell.launch", {
    commandPreview: shellCommand.slice(0, 200),
    socketName: session.socketName,
    localPort: session.localPort,
  });
  appendCastStartupLog(session, "后端：启动 scrcpy-server shell");

  const shellProcess = spawnAdbShell(session.serial, shellCommand);
  session.shellProcess = shellProcess;
  attachShellMonitor(session);

  logCastInfo(session.serial, "server.shell.spawned", {
    pid: shellProcess.pid,
    socketName: session.socketName,
    localPort: session.localPort,
    scid: session.scid === -1 ? "default" : `0x${session.scid.toString(16)}`,
    tunnel: session.tunnelMode,
  });
  appendCastStartupLog(session, `后端：scrcpy-server shell 已启动 (pid ${shellProcess.pid ?? "?"})`);

  await delay(session.webCast ? 900 : 450);

  return shellProcess;
}
