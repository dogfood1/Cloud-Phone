import { spawnSync } from "node:child_process";

import { runWithAdbLock } from "../adb-lock.js";
import { adbForwardRemove, clearDeviceTunnels, runAdb } from "../adb-command.js";
import { logCastInfo, logCastWarn } from "./cast-logger.js";
import { deleteCastSession, getCastSession, listCastSerials } from "./session-store.js";
import { logStreamStopped, summarizeStreamStats } from "./stream-stats.js";
import { teardownControlListener } from "./control-bridge.js";
import { teardownVideoListener } from "./video-bridge.js";

/**
 * @param {import("./session-store.js").ScrcpyCastSession} session
 */
function closeSessionResources(session) {
  for (const client of session.clients) {
    try {
      client.close();
    } catch {
      // ignore
    }
  }

  session.clients.clear();

  if (session.videoConnectionReject) {
    session.videoConnectionReject(new Error("Cast session stopped."));
    session.videoConnectionResolve = null;
    session.videoConnectionReject = null;
  }

  session.videoListenPromise = null;
  teardownControlListener(session);
  teardownVideoListener(session);

  killShellProcess(session.shellProcess);
  session.shellProcess = null;
}

function killShellProcess(shellProcess) {
  if (!shellProcess || shellProcess.killed) {
    return;
  }

  try {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(shellProcess.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      });
    } else {
      shellProcess.kill("SIGTERM");
    }
  } catch {
    // ignore
  }
}

async function cleanupDeviceAdb(session) {
  logCastInfo(session.serial, "adb.cleanup.begin", {
    localPort: session.localPort,
  });

  await adbForwardRemove(session.serial, session.localPort);
  await clearDeviceTunnels(session.serial);

  try {
    await runAdb(
      ["-s", session.serial, "shell", "pkill", "-f", "com.genymobile.scrcpy.Server"],
      { timeout: 5000 },
    );
    logCastInfo(session.serial, "adb.cleanup.server_killed", {});
  } catch {
    logCastWarn(session.serial, "adb.cleanup.server_kill_skipped", {
      message: "scrcpy server process not found or already stopped",
    });
  }

  logCastInfo(session.serial, "adb.cleanup.done", {});
}

export async function stopScrcpyCast(serial) {
  const session = getCastSession(serial);

  if (!session) {
    return false;
  }

  logCastInfo(serial, "cast.stop", {
    streaming: session.streaming,
    ...summarizeStreamStats(session.streamStats),
  });

  if (session.streaming || session.streamStats?.bytesReceived > 0) {
    logStreamStopped(serial, session, "user_stop");
  }

  closeSessionResources(session);
  deleteCastSession(serial);

  try {
    await runWithAdbLock(() => cleanupDeviceAdb(session));
  } catch (error) {
    logCastWarn(serial, "cast.stop.cleanup_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  logCastInfo(serial, "cast.stop.done", {});

  return true;
}

export async function stopAllScrcpyCasts() {
  for (const serial of listCastSerials()) {
    await stopScrcpyCast(serial);
  }
}
