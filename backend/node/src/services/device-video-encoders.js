import { getScrcpyServerJarPath, SCRCPY_SERVER_VERSION } from "../config/scrcpy-paths.js";
import { adbExecOut, adbPush, runAdb } from "./adb-command.js";
import { getCastSession } from "./scrcpy-cast/session-store.js";
import { getRemoteJarPath } from "./scrcpy-cast/server-args.js";

const REMOTE_JAR = getRemoteJarPath();
const ENCODER_CACHE_TTL_MS = 5 * 60 * 1000;
const LIST_ENCODERS_TIMEOUT_MS = 12_000;
const LIST_ENCODERS_HARD_TIMEOUT_MS = LIST_ENCODERS_TIMEOUT_MS + 3_000;

/** @type {Map<string, { encoders: object[], expiresAt: number }>} */
const encoderCache = new Map();

/** @type {Map<string, Promise<object[]>>} */
const inFlightBySerial = new Map();

const VIDEO_ENCODER_LINE = /--video-codec=(\w+)\s+--video-encoder=(\S+)/;

/** Generic fallback when device query fails (labels updated on frontend). */
export const GENERIC_VIDEO_ENCODER_FALLBACK = [
  { codec: "h264", value: "c2.android.avc.encoder", label: "c2.android.avc.encoder (fallback)" },
  { codec: "h264", value: "OMX.google.h264.encoder", label: "OMX.google.h264.encoder (fallback)" },
  { codec: "h265", value: "c2.android.hevc.encoder", label: "c2.android.hevc.encoder (fallback)" },
];

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

function withTimeout(promise, timeoutMs, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
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

function buildListEncodersCommand() {
  return [
    `CLASSPATH=${REMOTE_JAR}`,
    "app_process",
    "/",
    "com.genymobile.scrcpy.Server",
    SCRCPY_SERVER_VERSION,
    "list_encoders=true",
    "cleanup=false",
    "log_level=INFO",
  ].join(" ");
}

async function readEncodersFromLogcat(serial) {
  try {
    const { stdout } = await runAdb(
      ["-s", serial, "logcat", "-d", "-t", "400", "-s", "scrcpy:I"],
      { timeout: 8_000, maxBuffer: 4 * 1024 * 1024 },
    );

    return parseVideoEncodersFromServerLog(stdout);
  } catch {
    return [];
  }
}

async function listDeviceVideoEncodersOnce(serial) {
  const localJar = getScrcpyServerJarPath();
  const castSession = getCastSession(serial);
  const castActive =
    castSession &&
    !castSession.serverExited &&
    castSession.shellProcess &&
    !castSession.shellProcess.killed;

  if (!(await remoteJarExists(serial))) {
    await withTimeout(
      adbPush(serial, localJar, REMOTE_JAR),
      90_000,
      "Timed out pushing scrcpy-server to device.",
    );
  }

  const shellCommand = buildListEncodersCommand();

  let output = "";

  try {
    const { stdout, stderr } = await adbExecOut(serial, shellCommand, {
      timeout: LIST_ENCODERS_TIMEOUT_MS,
      maxBuffer: 4 * 1024 * 1024,
    });

    output = `${stdout ?? ""}\n${stderr ?? ""}`;
  } catch {
    if (!castActive) {
      try {
        const { stdout, stderr } = await runAdb(["-s", serial, "shell", shellCommand], {
          timeout: LIST_ENCODERS_TIMEOUT_MS,
          maxBuffer: 4 * 1024 * 1024,
        });

        output = `${stdout ?? ""}\n${stderr ?? ""}`;
      } catch {
        output = "";
      }
    }
  }

  let encoders = parseVideoEncodersFromServerLog(output);

  if (!encoders.length) {
    encoders = await readEncodersFromLogcat(serial);
  }

  if (!encoders.length) {
    const message = castActive
      ? "设备编码器列表查询超时（投屏进行中）。已使用通用编码器列表，可稍后在停止投屏后刷新。"
      : "无法从设备读取编码器列表，已使用通用编码器列表。";

    const error = new Error(message);
    error.fallback = true;
    error.encoders = [...GENERIC_VIDEO_ENCODER_FALLBACK];
    throw error;
  }

  return encoders;
}

/**
 * Query device MediaCodec video encoders via scrcpy-server list_encoders.
 * Does not use the global adb lock so mirror settings stay responsive during cast.
 * @param {string} serial
 */
export async function listDeviceVideoEncoders(serial) {
  const cached = encoderCache.get(serial);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.encoders;
  }

  let inFlight = inFlightBySerial.get(serial);

  if (!inFlight) {
    inFlight = withTimeout(
      listDeviceVideoEncodersOnce(serial),
      LIST_ENCODERS_HARD_TIMEOUT_MS,
      "Timed out listing device video encoders.",
    )
      .then((encoders) => {
        encoderCache.set(serial, {
          encoders,
          expiresAt: Date.now() + ENCODER_CACHE_TTL_MS,
        });
        return encoders;
      })
      .catch((error) => {
        if (error.encoders?.length) {
          encoderCache.set(serial, {
            encoders: error.encoders,
            expiresAt: Date.now() + 60_000,
          });
          return error.encoders;
        }

        const fallback = [...GENERIC_VIDEO_ENCODER_FALLBACK];
        encoderCache.set(serial, {
          encoders: fallback,
          expiresAt: Date.now() + 60_000,
        });
        return fallback;
      })
      .finally(() => {
        inFlightBySerial.delete(serial);
      });

    inFlightBySerial.set(serial, inFlight);
  }

  return inFlight;
}

export function clearDeviceVideoEncoderCache(serial) {
  if (serial) {
    encoderCache.delete(serial);
    inFlightBySerial.delete(serial);
    return;
  }

  encoderCache.clear();
  inFlightBySerial.clear();
}
