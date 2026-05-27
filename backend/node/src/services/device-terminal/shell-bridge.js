import { logCastInfo, logCastWarn } from "../scrcpy-cast/cast-logger.js";
import { spawnInteractiveAdbShell, writeShellInit, writeShellResize } from "./spawn-shell.js";

/**
 * Bridge a WebSocket client to an adb interactive shell (raw PTY stream).
 * @param {import("ws").WebSocket} ws
 * @param {string} serial
 */
export function attachTerminalWebSocket(ws, serial) {
  let shell;

  try {
    shell = spawnInteractiveAdbShell(serial);
  } catch (error) {
    ws.close(1011, error instanceof Error ? error.message : "spawn failed");
    return;
  }

  let closed = false;

  const closeAll = (reason) => {
    if (closed) {
      return;
    }

    closed = true;
    logCastInfo(serial, "terminal.closed", { reason });

    try {
      shell.kill("SIGTERM");
    } catch {
      // ignore
    }

    if (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) {
      ws.close();
    }
  };

  logCastInfo(serial, "terminal.open", { pid: shell.pid });

  const forwardStdout = (chunk) => {
    if (closed || ws.readyState !== ws.OPEN) {
      return;
    }

    ws.send(chunk, { binary: true });
  };

  shell.stdout.on("data", forwardStdout);
  shell.stderr.on("data", forwardStdout);

  shell.on("error", (error) => {
    logCastWarn(serial, "terminal.shell.error", {
      message: error instanceof Error ? error.message : String(error),
    });
    closeAll("shell_error");
  });

  shell.on("close", (code, signal) => {
    logCastInfo(serial, "terminal.shell.exit", { code, signal });
    closeAll("shell_exit");
  });

  ws.on("message", (data, isBinary) => {
    if (closed || !shell.stdin.writable) {
      return;
    }

    if (!isBinary) {
      try {
        const text = typeof data === "string" ? data : data.toString("utf8");
        const msg = JSON.parse(text);

        if (msg?.type === "resize" && Number.isFinite(msg.cols) && Number.isFinite(msg.rows)) {
          writeShellResize(shell, msg.cols, msg.rows);
        }
      } catch {
        // ignore malformed control messages
      }

      return;
    }

    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    shell.stdin.write(buffer);
  });

  ws.on("close", () => closeAll("ws_close"));
  ws.on("error", () => closeAll("ws_error"));

  setTimeout(() => {
    if (!closed) {
      writeShellInit(shell);
    }
  }, 120);
}
