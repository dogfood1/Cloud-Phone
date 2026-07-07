import { fetchWdaScreen } from "../ios/ios-wda-client.js";
import { logIosCastInfo } from "./cast-logger.js";
import { createIosCastSession } from "./cast-pipe.js";
import { deleteIosCastSession, getIosCastSession, setIosCastSession } from "./session-store.js";
import { appendIosStartupLog } from "./startup-log.js";
import { stopIosCast } from "./stop-session.js";

export async function startIosCast(serial) {
  const existing = getIosCastSession(serial);

  if (existing) {
    await stopIosCast(serial);
  }

  const session = await createIosCastSession(serial);
  setIosCastSession(serial, session);
  appendIosStartupLog(session, "后端：开始 iOS cast/start");
  logIosCastInfo(serial, "cast.start", { endpoint: session.endpoint });

  try {
    const screen = await fetchWdaScreen(session.endpoint.host, session.endpoint.httpPort);
    session.displaySize =
      screen?.width && screen?.height
        ? { width: screen.width, height: screen.height }
        : null;

    appendIosStartupLog(session, "后端：cast/start 完成，等待 WebSocket 连接");

    const encoded = encodeURIComponent(serial);

    return {
      serial,
      platform: "ios",
      mode: "ios-mjpeg",
      wsPath: `/api/devices/${encoded}/cast/ws`,
      castProtocol: "ios-mjpeg",
      displaySize: session.displaySize,
      endpoint: session.endpoint,
      video: {
        codec: "jpeg",
        nativeWidth: session.displaySize?.width ?? null,
        nativeHeight: session.displaySize?.height ?? null,
      },
      streaming: session.streaming,
      frameCount: session.frameCount,
      startupLogs: session.startupLogs,
    };
  } catch (error) {
    await stopIosCast(serial);
    throw error;
  }
}

export { ensureIosCastPipe, attachIosCastWebSocket } from "./cast-pipe.js";
