import { getScrcpyServerJarPath, SCRCPY_SERVER_VERSION } from "../config/scrcpy-paths.js";
import { adbExecOut, adbPush, runAdb } from "./adb-command.js";
import { getRemoteJarPath } from "./scrcpy-cast/server-args.js";

const REMOTE_JAR = getRemoteJarPath();
const LIST_TIMEOUT_MS = 12_000;
const CACHE_TTL_MS = 2 * 60 * 1000;

/** @type {Map<string, { cameras: object[], expiresAt: number }>} */
const cache = new Map();

const CAMERA_LINE =
  /--camera-id=(\S+)\s+\((\w+),\s*(\d+)x(\d+)(?:,\s*fps=([^)]+))?(?:,\s*zoom-range=([^)]+))?\)/;
const SIZE_LINE = /^\s*-\s*(\d+)x(\d+)\s*$/;

/**
 * @param {string} output
 */
export function parseCamerasFromServerLog(output) {
  const cameras = [];
  let current = null;

  for (const line of output.split(/\r?\n/)) {
    const cameraMatch = line.match(CAMERA_LINE);

    if (cameraMatch) {
      current = {
        id: cameraMatch[1],
        facing: cameraMatch[2],
        sensorWidth: Number(cameraMatch[3]),
        sensorHeight: Number(cameraMatch[4]),
        fpsRanges: cameraMatch[5] ? cameraMatch[5].split(",").map((item) => item.trim()) : [],
        zoomRange: cameraMatch[6] ?? null,
        sizes: [],
        highSpeedSizes: [],
      };
      cameras.push(current);
      continue;
    }

    if (!current) {
      continue;
    }

    if (line.includes("High speed capture")) {
      current._highSpeed = true;
      continue;
    }

    const sizeMatch = line.match(SIZE_LINE);

    if (sizeMatch) {
      const size = { width: Number(sizeMatch[1]), height: Number(sizeMatch[2]) };

      if (current._highSpeed) {
        current.highSpeedSizes.push(size);
      } else {
        current.sizes.push(size);
      }
    }
  }

  for (const camera of cameras) {
    delete camera._highSpeed;
  }

  return cameras;
}

function buildListCamerasCommand() {
  return [
    `CLASSPATH=${REMOTE_JAR}`,
    "app_process",
    "/",
    "com.genymobile.scrcpy.Server",
    SCRCPY_SERVER_VERSION,
    "list_cameras=true",
    "list_camera_sizes=true",
    "cleanup=false",
    "log_level=INFO",
  ].join(" ");
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

async function readCamerasFromLogcat(serial) {
  try {
    const { stdout } = await runAdb(
      ["-s", serial, "logcat", "-d", "-t", "300", "-s", "scrcpy:I"],
      { timeout: 8_000,
        maxBuffer: 2 * 1024 * 1024 },
    );

    return parseCamerasFromServerLog(stdout);
  } catch {
    return [];
  }
}

async function listDeviceCamerasOnce(serial) {
  if (!(await remoteJarExists(serial))) {
    await adbPush(serial, getScrcpyServerJarPath(), REMOTE_JAR);
  }

  const shellCommand = buildListCamerasCommand();
  let output = "";

  try {
    const { stdout, stderr } = await adbExecOut(serial, shellCommand, {
      timeout: LIST_TIMEOUT_MS,
      maxBuffer: 2 * 1024 * 1024,
    });

    output = `${stdout ?? ""}\n${stderr ?? ""}`;
  } catch {
    try {
      const { stdout, stderr } = await runAdb(["-s", serial, "shell", shellCommand], {
        timeout: LIST_TIMEOUT_MS,
        maxBuffer: 2 * 1024 * 1024,
      });

      output = `${stdout ?? ""}\n${stderr ?? ""}`;
    } catch {
      output = "";
    }
  }

  let cameras = parseCamerasFromServerLog(output);

  if (!cameras.length) {
    cameras = await readCamerasFromLogcat(serial);
  }

  return cameras;
}

/**
 * @param {string} serial
 */
export async function listDeviceCameras(serial) {
  const cached = cache.get(serial);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.cameras;
  }

  const cameras = await listDeviceCamerasOnce(serial);
  cache.set(serial, { cameras, expiresAt: Date.now() + CACHE_TTL_MS });
  return cameras;
}
