import { removeHarmonyUitestPort } from "./agent-setup.js";
import { logHarmonyCastInfo } from "./cast-logger.js";
import { deleteHarmonyCastSession, getHarmonyCastSession } from "./session-store.js";

export async function stopHarmonyCast(serial) {
  const session = getHarmonyCastSession(serial);

  if (!session) {
    return false;
  }

  session.stopping = true;
  logHarmonyCastInfo(serial, "cast.stop", { frameCount: session.frameCount ?? 0 });

  if (session.capture) {
    await session.capture.stop().catch(() => {});
    session.capture = null;
  }

  for (const client of session.clients) {
    try {
      client.close(1000, "harmony cast stopped");
    } catch {
      // ignore
    }
  }

  session.clients.clear();
  session.rpc?.close();
  session.rpc = null;

  await removeHarmonyUitestPort(serial, session.localPort).catch(() => {});
  deleteHarmonyCastSession(serial);
  return true;
}
