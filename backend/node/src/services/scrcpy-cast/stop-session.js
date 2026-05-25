import { adbForwardRemove } from "../adb-command.js";
import { deleteCastSession, getCastSession, listCastSerials } from "./session-store.js";

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

  if (session.videoSocket) {
    session.videoSocket.destroy();
    session.videoSocket = null;
  }

  if (session.shellProcess && !session.shellProcess.killed) {
    session.shellProcess.kill();
  }

  void adbForwardRemove(session.serial, session.localPort);
}

export async function stopScrcpyCast(serial) {
  const session = getCastSession(serial);

  if (!session) {
    return false;
  }

  closeSessionResources(session);
  deleteCastSession(serial);
  return true;
}

export async function stopAllScrcpyCasts() {
  for (const serial of listCastSerials()) {
    await stopScrcpyCast(serial);
  }
}
