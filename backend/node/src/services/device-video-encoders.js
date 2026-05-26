import { getScrcpyServerJarPath, SCRCPY_SERVER_VERSION } from "../config/scrcpy-paths.js";
import { adbExecOut, adbPush, runAdb } from "./adb-command.js";
import { getCastSession } from "./scrcpy-cast/session-store.js";
import { getRemoteJarPath } from "./scrcpy-cast/server-args.js";

const REMOTE_JAR = getRemoteJarPath();
const ENCODER_CACHE_TTL_MS = 5 * 60 * 1000;
const LIST_ENCODERS_TIMEOUT_MS = 12_000;
const LIST_ENCODERS_HARD_TIMEOUT_MS = LIST_ENCODERS_TIMEOUT_MS + 3_000;

/** @type {Map<string, { videoEncoders: object[], audioEncoders: object[], expiresAt: number }>} */
const encoderCache = new Map();

/** @type {Map<string, Promise<object[]>>} */
const inFlightBySerial = new Map();

const VIDEO_ENCODER_LINE = /--video-codec=(\w+)\s+--video-encoder=(\S+)/;
const AUDIO_ENCODER_LINE = /--audio-codec=(\w+)\s+--audio-encoder=(\S+)/;

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
export function parseAudioEncodersFromServerLog(output) {
  const encoders = [];
  const seen = new Set();

  for (const line of output.split(/\r?\n/)) {
    const match = line.match(AUDIO_ENCODER_LINE);

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

    return {
      videoEncoders: parseVideoEncodersFromServerLog(stdout),
      audioEncoders: parseAudioEncodersFromServerLog(stdout),
    };
  } catch {
    return { videoEncoders: [], audioEncoders: [] };
  }
}

async function listDeviceEncodersOnce(serial) {
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

  let videoEncoders = parseVideoEncodersFromServerLog(output);
  let audioEncoders = parseAudioEncodersFromServerLog(output);

  if (!videoEncoders.length || !audioEncoders.length) {
    const logcat = await readEncodersFromLogcat(serial);

    if (!videoEncoders.length) {
      videoEncoders = logcat.videoEncoders;
    }

    if (!audioEncoders.length) {
      audioEncoders = logcat.audioEncoders;
    }
  }

  if (!videoEncoders.length) {
    const message = castActive
      ? "设备编码器列表查询超时（投屏进行中）。已使用通用编码器列表，可稍后在停止投屏后刷新。"
      : "无法从设备读取编码器列表，已使用通用编码器列表。";

    const error = new Error(message);
    error.fallback = true;
    error.videoEncoders = [...GENERIC_VIDEO_ENCODER_FALLBACK];
    error.audioEncoders = audioEncoders;
    throw error;
  }

  return { videoEncoders, audioEncoders };
}

/**
 * Query device MediaCodec video encoders via scrcpy-server list_encoders.
 * Does not use the global adb lock so mirror settings stay responsive during cast.
 * @param {string} serial
 */
export async function listDeviceEncoders(serial) {
  const cached = encoderCache.get(serial);

  if (cached && cached.expiresAt > Date.now()) {
    return {
      videoEncoders: cached.videoEncoders,
      audioEncoders: cached.audioEncoders,
    };
  }

  let inFlight = inFlightBySerial.get(serial);

  if (!inFlight) {
    inFlight = withTimeout(
      listDeviceEncodersOnce(serial),
      LIST_ENCODERS_HARD_TIMEOUT_MS,
      "Timed out listing device encoders.",
    )
      .then((result) => {
        encoderCache.set(serial, {
          videoEncoders: result.videoEncoders,
          audioEncoders: result.audioEncoders,
          expiresAt: Date.now() + ENCODER_CACHE_TTL_MS,
        });
        return result;
      })
      .catch((error) => {
        if (error.videoEncoders?.length) {
          const result = {
            videoEncoders: error.videoEncoders,
            audioEncoders: error.audioEncoders ?? [],
          };
          encoderCache.set(serial, {
            ...result,
            expiresAt: Date.now() + 60_000,
          });
          return result;
        }

        const result = {
          videoEncoders: [...GENERIC_VIDEO_ENCODER_FALLBACK],
          audioEncoders: [],
        };
        encoderCache.set(serial, {
          ...result,
          expiresAt: Date.now() + 60_000,
        });
        return result;
      })
      .finally(() => {
        inFlightBySerial.delete(serial);
      });

    inFlightBySerial.set(serial, inFlight);
  }

  return inFlight;
}

/** @param {string} serial */
export async function listDeviceVideoEncoders(serial) {
  const { videoEncoders } = await listDeviceEncoders(serial);
  return videoEncoders;
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
