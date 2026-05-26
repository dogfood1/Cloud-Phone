import { runAdb, spawnAdbShell } from "../adb-command.js";
import { logCastInfo } from "./cast-logger.js";
import { buildServerShellCommand } from "./server-args.js";
import { attachShellMonitor } from "./shell-monitor.js";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ensureServerShell(session, options = {}) {
  if (session.shellProcess && !session.serverExited) {
    return session.shellProcess;
  }

  if (session.serverExited) {
    session.serverExited = false;
    session.serverExitCode = null;
    session.serverExitSignal = null;
  }

  const shellCommand = buildServerShellCommand(session.scid, options);

  // Web cast server listens on tcp:8886 on the device. If a previous server instance
  // crashed or was left running, the next start fails with "Address already in use".
  // Stop any leftover scrcpy server before launching a new one.
  try {
    await runAdb(
      ["-s", session.serial, "shell", "pkill", "-f", "com.genymobile.scrcpy.Server"],
      { timeout: 5000 },
    );
  } catch {
    // ignore
  }

  logCastInfo(session.serial, "server.shell.launch", {
    commandPreview: shellCommand.slice(0, 200),
    socketName: session.socketName,
    localPort: session.localPort,
  });

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

  await delay(450);

  return shellProcess;
}
