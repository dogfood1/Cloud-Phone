import net from "node:net";

/**
 * Read scrcpy dummy connection byte (tunnel_forward).
 * Must not use `data` handlers that drop extra bytes from the first TCP chunk.
 * @param {import("node:net").Socket} socket
 */
export function readDummyByte(socket) {
  socket.pause();

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      socket.off("readable", onReadable);
      socket.off("error", onError);
    };

    const onError = (error) => {
      cleanup();
      reject(error);
    };

    const onReadable = () => {
      const chunk = socket.read(1);

      if (!chunk) {
        return;
      }

      cleanup();
      resolve(chunk[0] ?? 0);
    };

    socket.on("readable", onReadable);
    socket.once("error", onError);
    onReadable();
  });
}

/**
 * @param {number} localPort
 * @param {{ readDummyByte?: boolean }} [options]
 */
export function connectScrcpySocket(localPort, options = {}) {
  const readDummy = options.readDummyByte !== false;

  return new Promise((resolve, reject) => {
    const socket = net.connect({ host: "127.0.0.1", port: localPort });
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Timed out connecting to scrcpy port ${localPort}.`));
    }, 12_000);

    const fail = (error) => {
      clearTimeout(timeout);
      reject(error instanceof Error ? error : new Error("Socket connect failed."));
    };

    socket.once("error", fail);

    socket.once("connect", async () => {
      try {
        socket.removeListener("error", fail);

        if (readDummy) {
          await readDummyByte(socket);
        }

        socket.resume();
        clearTimeout(timeout);
        socket.setNoDelay(true);
        resolve(socket);
      } catch (error) {
        socket.destroy();
        fail(error);
      }
    });
  });
}
