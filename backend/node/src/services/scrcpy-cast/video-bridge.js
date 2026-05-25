import net from "node:net";

/**
 * @param {import("./session-store.js").ScrcpyCastSession} session
 */
export function connectVideoSocket(session) {
  if (session.videoSocket) {
    return Promise.resolve(session.videoSocket);
  }

  return new Promise((resolve, reject) => {
    const socket = net.connect(
      { host: "127.0.0.1", port: session.localPort },
      () => {
        session.videoSocket = socket;
        session.streaming = true;
        resolve(socket);
      },
    );

    socket.setNoDelay(true);

    socket.on("data", (chunk) => {
      for (const client of session.clients) {
        if (client.readyState === client.OPEN) {
          client.send(chunk);
        }
      }
    });

    socket.on("close", () => {
      session.videoSocket = null;
      session.streaming = false;
    });

    socket.on("error", (error) => {
      session.videoSocket = null;
      session.streaming = false;
      reject(error);
    });

    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error("Timed out connecting to scrcpy video socket."));
    }, 12_000);

    socket.once("connect", () => clearTimeout(timeout));
    socket.once("error", () => clearTimeout(timeout));
  });
}

/**
 * @param {import("./session-store.js").ScrcpyCastSession} session
 */
export function attachWebSocketClient(session, ws) {
  session.clients.add(ws);

  ws.on("close", () => {
    session.clients.delete(ws);
  });
}
