import {
  getScrcpyServerJarPath,
  isScrcpyServerReady,
  SCRCPY_SERVER_VERSION,
} from "../../config/scrcpy-paths.js";
import { adbForward, adbPush, spawnAdbShell } from "../adb-command.js";
import {
  buildServerShellCommand,
  buildSocketName,
  getRemoteJarPath,
  pickLocalPort,
  pickScid,
} from "./server-args.js";
import { deleteCastSession, getCastSession, setCastSession } from "./session-store.js";
import { stopScrcpyCast } from "./stop-session.js";
import { connectVideoSocket } from "./video-bridge.js";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectVideoSocketWithRetry(session, attempts = 6) {
  let lastError = new Error("Unable to connect scrcpy video socket.");

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await connectVideoSocket(session);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : lastError;
      await delay(250);
    }
  }

  throw lastError;
}

export async function startScrcpyCast(serial, options = {}) {
  if (!isScrcpyServerReady()) {
    throw new Error(
      "scrcpy-server is missing. Run: node tools/build-scrcpy.mjs (auto-downloads prebuilt if Meson is absent)",
    );
  }

  const existing = getCastSession(serial);

  if (existing) {
    await stopScrcpyCast(serial);
  }

  const scid = pickScid();
  const localPort = pickLocalPort();
  const socketName = buildSocketName(scid);
  const jarPath = getScrcpyServerJarPath();
  const shellCommand = buildServerShellCommand(scid, options);

  await adbPush(serial, jarPath, getRemoteJarPath());
  await adbForward(serial, localPort, socketName);

  const shellProcess = spawnAdbShell(serial, shellCommand);

  const session = {
    serial,
    scid,
    socketName,
    localPort,
    shellProcess,
    videoSocket: null,
    clients: new Set(),
    starting: true,
    streaming: false,
  };

  setCastSession(serial, session);

  shellProcess.on("exit", () => {
    if (getCastSession(serial) === session) {
      deleteCastSession(serial);
    }
  });

  try {
    await delay(350);
    await connectVideoSocketWithRetry(session);
    session.starting = false;
  } catch (error) {
    await stopScrcpyCast(serial);
    throw error;
  }

  return {
    serial,
    mode: "h264",
    serverVersion: SCRCPY_SERVER_VERSION,
    localPort,
    scid,
    socketName,
    wsPath: `/api/devices/${encodeURIComponent(serial)}/cast/ws`,
  };
}

export async function ensureCastVideoPipe(serial) {
  const session = getCastSession(serial);

  if (!session) {
    throw new Error("Cast session is not active.");
  }

  if (!session.videoSocket) {
    await connectVideoSocket(session);
  }

  return session;
}
