import { logCastError, logCastInfo, logCastWarn } from "./cast-logger.js";
import { resolveCastServerOptions } from "./cast-options.js";
import { parseDeviceMessages } from "./device-msg.js";
import { connectScrcpySocket } from "./socket-connect.js";
import { buildWsScrcpyClipboardMessage } from "./ws-scrcpy-protocol.js";

function sendDeviceMessageToStreamClients(session, message) {
  let payload = null;

  if (message?.type === "clipboard") {
    payload = buildWsScrcpyClipboardMessage(message.text ?? "");
  }

  if (!payload) {
    return;
  }

  for (const client of session.clients ?? []) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}

function attachControlSocketHandlers(session) {
  session.controlPending = Buffer.alloc(0);

  session.controlSocket.on("data", (chunk) => {
    session.controlPending = Buffer.concat([session.controlPending, chunk]);
    const { messages, remaining } = parseDeviceMessages(session.controlPending);
    session.controlPending = remaining;

    for (const message of messages) {
      sendDeviceMessageToStreamClients(session, message);
    }
  });

  session.controlSocket.on("close", () => {
    session.controlSocket = null;
    logCastInfo(session.serial, "control.socket.closed", {});
  });

  session.controlSocket.on("error", (error) => {
    logCastWarn(session.serial, "control.socket.error", {
      message: error.message,
    });
  });
}

export async function connectControlSocket(session) {
  const options = resolveCastServerOptions(session.castOptions ?? {});

  if (!options.control || session.controlSocket) {
    return session.controlSocket;
  }

  logCastInfo(session.serial, "control.connect.start", {
    localPort: session.localPort,
  });

  const socket = await connectScrcpySocket(session.localPort, { readDummyByte: false });
  session.controlSocket = socket;
  attachControlSocketHandlers(session);

  logCastInfo(session.serial, "control.connect.ready", {
    localPort: session.localPort,
  });

  return socket;
}

export function attachControlWebSocketClient(session, ws) {
  session.controlClients.add(ws);

  ws.on("message", (data) => {
    try {
      if (!session.controlSocket) {
        return;
      }

      if (typeof data === "string") {
        return;
      }

      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      session.controlSocket.write(buffer);
    } catch (error) {
      logCastWarn(session.serial, "control.ws.invalid", {
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  });

  ws.on("close", () => {
    session.controlClients.delete(ws);
  });

  // ws-scrcpy protocol does not have JSON ready on control channel.
}

export function teardownControlListener(session) {
  for (const client of session.controlClients) {
    try {
      client.close();
    } catch {
      // ignore
    }
  }

  session.controlClients.clear();
  session.controlPending = null;

  if (session.controlSocket) {
    try {
      session.controlSocket.destroy();
    } catch {
      // ignore
    }

    session.controlSocket = null;
  }
}

export async function ensureControlPipe(session) {
  if (session.controlSocket) {
    return session;
  }

  try {
    await connectControlSocket(session);
    return session;
  } catch (error) {
    logCastError(session.serial, "control.connect.failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
}
