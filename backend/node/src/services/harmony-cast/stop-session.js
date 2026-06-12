import { removeHarmonyUitestPort } from "./agent-setup.js";
import { stopHarmonyCastPipe } from "./cast-pipe.js";
import { logHarmonyCastInfo } from "./cast-logger.js";
import { deleteHarmonyCastSession, getHarmonyCastSession } from "./session-store.js";

export async function stopHarmonyCast(serial) {
  const session = getHarmonyCastSession(serial);

  if (!session) {
    return false;
  }

  session.stopping = true;
  logHarmonyCastInfo(serial, "cast.stop", { frameCount: session.frameCount ?? 0 });

  for (const client of session.clients) {
    try {
      client.close(1000, "harmony cast stopped");
    } catch {
      // ignore
    }
  }

  session.clients.clear();
  await stopHarmonyCastPipe(session);
  await removeHarmonyUitestPort(serial, session.localPort).catch(() => {});
  deleteHarmonyCastSession(serial);
  return true;
}
