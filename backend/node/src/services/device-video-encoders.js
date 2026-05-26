import { getScrcpyServerJarPath, SCRCPY_SERVER_VERSION } from "../config/scrcpy-paths.js";
import { runWithAdbLock } from "./adb-lock.js";
import { adbPush, runAdb } from "./adb-command.js";
import { getRemoteJarPath } from "./scrcpy-cast/server-args.js";

const REMOTE_JAR = getRemoteJarPath();
const ENCODER_CACHE_TTL_MS = 5 * 60 * 1000;
const LIST_ENCODERS_TIMEOUT_MS = 18_000;

/** @type {Map<string, { encoders: object[], expiresAt: number }>} */
const encoderCache = new Map();

const VIDEO_ENCODER_LINE =
  /--video-codec=(\w+)\s+--video-encoder=(\S+)/;

/**
 * @param {string} output
 * @returns {{ codec: string, value: string, label: string }[]}
 */
export function parseVideoEncodersFromServerLog(output) {
  const encoders = [];
  const seen = new Set();

  for (const line of output.split(/\r?\n/)) {
    const match = line.match(VIDEO_ENCODER_LINE);

    if (!match) {
      continue;
    }

    const codec = match[1].toLowerCase();
    const value = match[2];
    const key = `${codec}:${value}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    let label = value;
    const hw = line.match(/\((hw|sw|hybrid)\)/i);

    if (hw) {
      label += ` (${hw[1]})`;
    }

    if (line.includes("[vendor]")) {
      label += " [vendor]";
    }

    encoders.push({ codec, value, label });
  }

  return encoders;
}

async function remoteJarExists(serial) {
  try {
    const { stdout } = await runAdb(
      ["-s", serial, "shell", `test -f ${REMOTE_JAR} && echo ok`],
      { timeout: 5_000 },
    );

    return String(stdout).includes("ok");
  } catch {
    return false;
  }
}

async function listDeviceVideoEncodersUnsafe(serial) {
  const localJar = getScrcpyServerJarPath();

  if (!(await remoteJarExists(serial))) {
    await adbPush(serial, localJar, REMOTE_JAR);
  }

  const shellCommand = [
    `CLASSPATH=${REMOTE_JAR}`,
    "app_process",
    "/",
    "com.genymobile.scrcpy.Server",
    SCRCPY_SERVER_VERSION,
    "list_encoders=true",
    "cleanup=false",
    "log_level=INFO",
  ].join(" ");

  const { stdout, stderr } = await runAdb(
    ["-s", serial, "shell", shellCommand],
    { timeout: LIST_ENCODERS_TIMEOUT_MS },
  );

  const output = `${stdout ?? ""}\n${stderr ?? ""}`;
  return parseVideoEncodersFromServerLog(output);
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Timed out listing device video encoders.")), timeoutMs);
    }),
  ]);
}

/**
 * Query device MediaCodec video encoders via scrcpy-server list_encoders.
 * @param {string} serial
 */
export async function listDeviceVideoEncoders(serial) {
  const cached = encoderCache.get(serial);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.encoders;
  }

  const encoders = await runWithAdbLock(() =>
    withTimeout(listDeviceVideoEncodersUnsafe(serial), LIST_ENCODERS_TIMEOUT_MS + 5_000),
  );

  encoderCache.set(serial, {
    encoders,
    expiresAt: Date.now() + ENCODER_CACHE_TTL_MS,
  });

  return encoders;
}

export function clearDeviceVideoEncoderCache(serial) {
  if (serial) {
    encoderCache.delete(serial);
    return;
  }

  encoderCache.clear();
}
