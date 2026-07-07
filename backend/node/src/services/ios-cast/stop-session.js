import { logIosCastInfo } from "./cast-logger.js";
import { stopIosCastPipe } from "./cast-pipe.js";
import { deleteIosCastSession, getIosCastSession } from "./session-store.js";

export async function stopIosCast(serial) {
  const session = getIosCastSession(serial);

  if (!session) {
    return false;
  }

  session.stopping = true;
  logIosCastInfo(serial, "cast.stop", {});

  for (const client of session.clients) {
    try {
      client.close(1000, "cast stopped");
    } catch {
      // ignore
    }
  }

  session.clients.clear();
  await stopIosCastPipe(session);
  deleteIosCastSession(serial);
  return true;
}
