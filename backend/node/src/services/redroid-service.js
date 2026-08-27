import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

import { BACKEND_DATA_PATH } from "../config/paths.js";

const execFileAsync = promisify(execFile);

const DEFAULT_IMAGE = "redroid:13.0.0_arm64_only_extcam_rgba_blob_jpegfix";
const DEFAULT_WORKDIR = "/root/redroid-extcam";
const PRODUCT_NAMESPACES = ["", "product", "system", "vendor", "odm"];
const CAMERA_IMAGE_FIT_MODES = new Set(["cover", "contain", "stretch"]);

function config() {
  const workdir = process.env.REDROID_HOST_WORKDIR || DEFAULT_WORKDIR;
  const videoNr = Number(process.env.REDROID_CAMERA_VIDEO_NR || 20);
  return {
    image: process.env.REDROID_IMAGE_TAG || DEFAULT_IMAGE,
    workdir,
    cameraImagePath: process.env.REDROID_CAMERA_IMAGE_PATH || path.join(workdir, "static-camera.png"),
    cameraService: process.env.REDROID_CAMERA_SERVICE || "redroid-static-camera.service",
    cameraWidth: Number(process.env.REDROID_CAMERA_WIDTH || 1280),
    cameraHeight: Number(process.env.REDROID_CAMERA_HEIGHT || 720),
    cameraFps: Number(process.env.REDROID_CAMERA_FPS || 30),
    videoNr,
    adbPortBase: Number(process.env.REDROID_ADB_PORT_BASE || 5555),
    defaultWidth: Number(process.env.REDROID_WIDTH || 720),
    defaultHeight: Number(process.env.REDROID_HEIGHT || 1280),
    defaultDpi: Number(process.env.REDROID_DPI || 320),
    defaultFps: Number(process.env.REDROID_FPS || 30),
  };
}

function run(command, args, options = {}) {
  return execFileAsync(command, args, {
    windowsHide: true,
    timeout: options.timeout ?? 30_000,
    maxBuffer: options.maxBuffer ?? 4 * 1024 * 1024,
    cwd: options.cwd,
    env: options.env,
  });
}

async function commandResult(command, args, options = {}) {
  try {
    const { stdout = "", stderr = "" } = await run(command, args, options);
    return {
      ok: true,
      command,
      args,
      stdout,
      stderr,
      output: `${stdout}\n${stderr}`.trim(),
    };
  } catch (error) {
    return {
      ok: false,
      command,
      args,
      stdout: error?.stdout ?? "",
      stderr: error?.stderr ?? "",
      output: error instanceof Error ? error.message : String(error ?? ""),
    };
  }
}

function runDocker(args, options = {}) {
  return run("docker", args, {
    timeout: options.timeout ?? 60_000,
    maxBuffer: options.maxBuffer ?? 8 * 1024 * 1024,
  });
}

function assertName(name) {
  const value = String(name ?? "").trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{1,62}$/.test(value)) {
    const error = new Error("Container name must be 2-63 characters and use letters, numbers, dot, underscore or dash.");
    error.statusCode = 400;
    throw error;
  }
  return value;
}

function normalizeInteger(value, fallback, min, max, label) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < min || number > max) {
    const error = new Error(`${label} must be an integer between ${min} and ${max}.`);
    error.statusCode = 400;
    throw error;
  }
  return number;
}

function normalizeBoolean(value, fallback, label) {
  if (value == null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  const text = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(text)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(text)) {
    return false;
  }

  const error = new Error(`${label} must be a boolean.`);
  error.statusCode = 400;
  throw error;
}

function normalizeCameraImageFitMode(value) {
  const mode = String(value ?? "cover").trim().toLowerCase();
  if (!CAMERA_IMAGE_FIT_MODES.has(mode)) {
    const error = new Error("Camera image fit mode must be cover, contain or stretch.");
    error.statusCode = 400;
    throw error;
  }
  return mode;
}

function buildCameraImageFilter(width, height, options = {}) {
  const fitMode = normalizeCameraImageFitMode(options.fitMode);
  const mirror = normalizeBoolean(options.mirror, false, "Camera image mirror correction");
  const filters = [];

  if (fitMode === "cover") {
    filters.push(
      `scale=${width}:${height}:force_original_aspect_ratio=increase`,
      `crop=${width}:${height}`,
    );
  } else if (fitMode === "contain") {
    filters.push(
      `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
      `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
    );
  } else {
    filters.push(`scale=${width}:${height}`);
  }

  if (mirror) {
    filters.push("hflip");
  }

  filters.push("setsar=1");

  return {
    filter: filters.join(","),
    fitMode,
    mirror,
  };
}

function propValue(value, fallback = "") {
  return String(value ?? fallback)
    .replace(/[\r\n]/g, " ")
    .trim()
    .slice(0, 96);
}

function propToken(value, fallback = "redroid") {
  const normalized = propValue(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

function buildMac(prefix) {
  const bytes = Array.from({ length: 5 }, () => Math.floor(Math.random() * 256));
  return [prefix, ...bytes].map((item) => item.toString(16).padStart(2, "0")).join(":");
}

function buildProductArgs(model = {}) {
  const brand = propValue(model.brand || model.manufacturer, "Google");
  const manufacturer = propValue(model.manufacturer || model.brand, brand);
  const modelName = propValue(model.modelCode || model.model || model.marketingName, "G-2PW4100");
  const device = propToken(model.device || model.codename, "sailfish");
  const productName = propToken(model.productName || model.name || device, device);
  const args = [];

  for (const namespace of PRODUCT_NAMESPACES) {
    const prefix = namespace ? `ro.product.${namespace}` : "ro.product";
    args.push(`${prefix}.brand=${brand}`);
    args.push(`${prefix}.manufacturer=${manufacturer}`);
    args.push(`${prefix}.model=${modelName}`);
    args.push(`${prefix}.device=${device}`);
    args.push(`${prefix}.name=${productName}`);
  }

  return args;
}

function cameraImagePathForVideo(cfg, videoNr) {
  if (Number(videoNr) === Number(cfg.videoNr)) {
    return cfg.cameraImagePath;
  }

  return path.join(cfg.workdir, "camera-images", `static-video${videoNr}.png`);
}

function extractPort(inspect) {
  const bindings = inspect?.NetworkSettings?.Ports?.["5555/tcp"];
  return bindings?.[0]?.HostPort ? Number(bindings[0].HostPort) : null;
}

function extractVideoNr(inspect) {
  const labels = inspect?.Config?.Labels ?? {};
  if (labels["cloud-phone.redroid.videoNr"]) {
    return Number(labels["cloud-phone.redroid.videoNr"]);
  }

  const hostConfig = inspect?.HostConfig?.Devices ?? [];
  const match = hostConfig
    .map((item) => item?.PathOnHost ?? "")
    .join(" ")
    .match(/\/dev\/video(\d+)/);
  return match ? Number(match[1]) : null;
}

function mapContainer(inspect) {
  const labels = inspect?.Config?.Labels ?? {};
  const image = inspect?.Config?.Image ?? "";
  return {
    id: inspect?.Id ?? "",
    name: String(inspect?.Name ?? "").replace(/^\//, ""),
    image,
    state: inspect?.State?.Status ?? "unknown",
    running: Boolean(inspect?.State?.Running),
    createdAt: inspect?.Created ?? null,
    adbPort: extractPort(inspect),
    videoNr: extractVideoNr(inspect),
    dataDir: inspect?.Mounts?.find((item) => item.Destination === "/data")?.Source ?? null,
    model: {
      brand: labels["cloud-phone.redroid.brand"] ?? null,
      manufacturer: labels["cloud-phone.redroid.manufacturer"] ?? null,
      modelCode: labels["cloud-phone.redroid.modelCode"] ?? null,
      marketingName: labels["cloud-phone.redroid.marketingName"] ?? null,
      device: labels["cloud-phone.redroid.device"] ?? null,
      productName: labels["cloud-phone.redroid.productName"] ?? null,
    },
    managed: labels["cloud-phone.redroid"] === "1",
  };
}

async function inspectContainers(names) {
  if (!names.length) {
    return [];
  }

  const { stdout } = await runDocker(["inspect", ...names], {
    maxBuffer: 16 * 1024 * 1024,
  });
  return JSON.parse(stdout).map(mapContainer);
}

export function getRedroidRuntimeConfig() {
  const cfg = config();
  return {
    image: cfg.image,
    workdir: cfg.workdir,
    cameraImagePath: cfg.cameraImagePath,
    cameraService: cfg.cameraService,
    cameraWidth: cfg.cameraWidth,
    cameraHeight: cfg.cameraHeight,
    cameraFps: cfg.cameraFps,
    defaultVideoNr: cfg.videoNr,
    defaultAdbPortBase: cfg.adbPortBase,
  };
}

export async function listRedroidInstances() {
  const { stdout } = await runDocker(["ps", "-a", "--format", "{{json .}}"], {
    maxBuffer: 16 * 1024 * 1024,
  });
  const rows = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const names = rows
    .filter((row) => {
      const image = String(row.Image ?? "");
      const name = String(row.Names ?? "");
      const normalizedImage = image.toLowerCase();
      const normalizedName = name.toLowerCase();
      if (normalizedName.startsWith("cloud-phone")) {
        return false;
      }
      return (
        normalizedImage.startsWith("redroid") ||
        normalizedImage.includes("/redroid") ||
        normalizedName.startsWith("test") ||
        normalizedName.startsWith("redroid")
      );
    })
    .map((row) => String(row.Names));

  return inspectContainers(names);
}

async function getManagedCameraWriterStatus(videoNr) {
  const pidPath = path.join(BACKEND_DATA_PATH, `redroid-camera-video${videoNr}.pid`);

  try {
    const pid = Number((await fs.readFile(pidPath, "utf8")).trim());
    if (!Number.isInteger(pid) || pid <= 1) {
      return { active: false, pid: null, pidPath };
    }

    try {
      process.kill(pid, 0);
      return { active: true, pid, pidPath };
    } catch {
      await fs.rm(pidPath, { force: true });
      return { active: false, pid, pidPath };
    }
  } catch {
    return { active: false, pid: null, pidPath };
  }
}

export async function getRedroidCameraStatus(options = {}) {
  const cfg = config();
  const videoNr = normalizeInteger(options.videoNr, cfg.videoNr, 0, 255, "Video device number");
  const imagePath = cameraImagePathForVideo(cfg, videoNr);
  const managedWriter = await getManagedCameraWriterStatus(videoNr);
  const serviceProbe =
    Number(videoNr) === Number(cfg.videoNr)
      ? await commandResult("nsenter", [
          "--target",
          "1",
          "--mount",
          "--uts",
          "--ipc",
          "--net",
          "--pid",
          "/usr/bin/systemctl",
          "is-active",
          cfg.cameraService,
        ], { timeout: 8_000 })
      : {
          ok: managedWriter.active,
          output: managedWriter.active
            ? `managed ffmpeg writer active, pid=${managedWriter.pid}`
            : "managed ffmpeg writer inactive",
          stdout: managedWriter.active ? "active\n" : "",
          stderr: "",
        };

  const [statResult, serviceResult, v4l2Result] = await Promise.all([
    fs.stat(imagePath).catch(() => null),
    serviceProbe,
    commandResult("v4l2-ctl", [`--device=/dev/video${videoNr}`, "--all"], {
      timeout: 8_000,
      maxBuffer: 1024 * 1024,
    }),
  ]);

  return {
    videoNr,
    device: `/dev/video${videoNr}`,
    imagePath,
    imageExists: Boolean(statResult),
    imageUpdatedAt: statResult?.mtime?.toISOString?.() ?? null,
    imageSize: statResult?.size ?? null,
    service: Number(videoNr) === Number(cfg.videoNr) ? cfg.cameraService : "managed-ffmpeg",
    serviceActive: serviceResult.ok && serviceResult.stdout.trim() === "active",
    serviceOutput: serviceResult.output,
    managedWriter,
    v4l2Output: v4l2Result.output,
    v4l2Ok: v4l2Result.ok,
  };
}

export async function findNextAdbPort(startPort = config().adbPortBase) {
  const instances = await listRedroidInstances().catch(() => []);
  const usedPorts = new Set(instances.map((item) => item.adbPort).filter(Boolean));

  for (let port = Number(startPort); port < Number(startPort) + 100; port += 1) {
    if (usedPorts.has(port)) {
      continue;
    }

    if (await isLocalPortAvailable(port)) {
      return port;
    }
  }

  return Number(startPort);
}

function isLocalPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "0.0.0.0");
  });
}

export async function createRedroidInstance(payload = {}) {
  const cfg = config();
  const name = assertName(payload.name || `redroid-${Date.now().toString(36)}`);
  const image = propValue(payload.image || cfg.image, cfg.image);
  const adbPort = normalizeInteger(payload.adbPort, await findNextAdbPort(), 1, 65535, "ADB port");
  const videoNr = normalizeInteger(payload.videoNr, cfg.videoNr, 0, 255, "Video device number");
  const width = normalizeInteger(payload.width, cfg.defaultWidth, 320, 4096, "Display width");
  const height = normalizeInteger(payload.height, cfg.defaultHeight, 320, 4096, "Display height");
  const dpi = normalizeInteger(payload.dpi, cfg.defaultDpi, 120, 640, "Display DPI");
  const fps = normalizeInteger(payload.fps, cfg.defaultFps, 15, 120, "Display FPS");
  const dataDir = path.join(cfg.workdir, `data-${name}`);
  const model = payload.model ?? {};

  await fs.mkdir(dataDir, { recursive: true });
  await runDocker(["image", "inspect", image], { timeout: 15_000 });

  const labels = [
    "cloud-phone.redroid=1",
    `cloud-phone.redroid.adbPort=${adbPort}`,
    `cloud-phone.redroid.videoNr=${videoNr}`,
    `cloud-phone.redroid.brand=${propValue(model.brand || model.manufacturer, "Google")}`,
    `cloud-phone.redroid.manufacturer=${propValue(model.manufacturer || model.brand, "Google")}`,
    `cloud-phone.redroid.modelCode=${propValue(model.modelCode || model.model, "G-2PW4100")}`,
    `cloud-phone.redroid.marketingName=${propValue(model.marketingName, "")}`,
    `cloud-phone.redroid.device=${propToken(model.device || model.codename, "sailfish")}`,
    `cloud-phone.redroid.productName=${propToken(model.productName || model.name, "sailfish")}`,
  ];

  const bootArgs = [
    "androidboot.use_memfd=true",
    `androidboot.redroid_width=${width}`,
    `androidboot.redroid_height=${height}`,
    `androidboot.redroid_dpi=${dpi}`,
    `androidboot.redroid_fps=${fps}`,
    "androidboot.redroid_gpu_mode=guest",
    "ro.product.locale=zh-CN",
    "persist.sys.locale=zh-CN",
    "ro.vendor.camera.external.jpegMirrorCorrection=false",
    "ro.vendor.camera.external.forceHighQualityJpeg=true",
    `ro.build.display.id=AEM.${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.${Math.random().toString(16).slice(2, 10).toUpperCase()}`,
    `ro.boot.wifimacaddr=${buildMac(0x72)}`,
    `ro.boot.btmacaddr=${buildMac(0xa6)}`,
    ...buildProductArgs(model),
  ];

  const args = [
    "run",
    "-d",
    "--privileged",
    "--restart",
    "unless-stopped",
    "--name",
    name,
    "-v",
    `${dataDir}:/data`,
    "-p",
    `${adbPort}:5555`,
    "--device",
    `/dev/video${videoNr}:/dev/video${videoNr}`,
  ];

  for (const label of labels) {
    args.push("--label", label);
  }

  args.push(image, ...bootArgs);

  const { stdout } = await runDocker(args, { timeout: 60_000 });
  const [instance] = await inspectContainers([name]);

  return {
    containerId: stdout.trim(),
    instance,
  };
}

export async function startRedroidInstance(name) {
  const safeName = assertName(name);
  const { stdout, stderr } = await runDocker(["start", safeName], { timeout: 30_000 });
  return { name: safeName, output: `${stdout}\n${stderr}`.trim() };
}

export async function stopRedroidInstance(name) {
  const safeName = assertName(name);
  const { stdout, stderr } = await runDocker(["stop", safeName], { timeout: 60_000 });
  return { name: safeName, output: `${stdout}\n${stderr}`.trim() };
}

export async function deleteRedroidInstance(name, options = {}) {
  const safeName = assertName(name);
  const [before] = await inspectContainers([safeName]).catch(() => []);
  const { stdout, stderr } = await runDocker(["rm", "-f", safeName], { timeout: 60_000 });

  if (options.removeData && before?.dataDir?.startsWith(`${config().workdir}/data-`)) {
    await fs.rm(before.dataDir, { recursive: true, force: true });
  }

  return {
    name: safeName,
    removedData: Boolean(options.removeData && before?.dataDir),
    output: `${stdout}\n${stderr}`.trim(),
  };
}

function decodeImagePayload(payload = {}) {
  const raw = String(payload.imageDataUrl || payload.imageBase64 || "");
  const match = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  const base64 = match ? match[2] : raw;
  const buffer = Buffer.from(base64, "base64");

  if (!buffer.length || buffer.length > 20 * 1024 * 1024) {
    const error = new Error("Image must be a base64 image payload up to 20 MB.");
    error.statusCode = 400;
    throw error;
  }

  return buffer;
}

async function restartHostCameraService(service) {
  const attempts = [
    await commandResult("nsenter", [
      "--target",
      "1",
      "--mount",
      "--uts",
      "--ipc",
      "--net",
      "--pid",
      "/usr/bin/systemctl",
      "restart",
      service,
    ], { timeout: 20_000 }),
    await commandResult("systemctl", ["restart", service], { timeout: 20_000 }),
  ];

  return {
    ok: attempts.some((item) => item.ok),
    attempts,
  };
}

async function stopManagedCameraWriter(videoNr) {
  const pidPath = path.join(BACKEND_DATA_PATH, `redroid-camera-video${videoNr}.pid`);
  try {
    const pid = Number((await fs.readFile(pidPath, "utf8")).trim());
    if (Number.isInteger(pid) && pid > 1) {
      process.kill(pid, "SIGTERM");
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  } catch {
    // No managed writer is active.
  }
  await fs.rm(pidPath, { force: true });
}

async function startManagedCameraWriter(imagePath, videoNr, cfg) {
  await stopManagedCameraWriter(videoNr);
  await fs.mkdir(BACKEND_DATA_PATH, { recursive: true });

  const logPath = path.join(BACKEND_DATA_PATH, `redroid-camera-video${videoNr}.log`);
  const pidPath = path.join(BACKEND_DATA_PATH, `redroid-camera-video${videoNr}.pid`);
  const log = await fs.open(logPath, "a");
  const child = spawn(
    "ffmpeg",
    [
      "-nostdin",
      "-hide_banner",
      "-loglevel",
      "warning",
      "-re",
      "-loop",
      "1",
      "-framerate",
      String(cfg.cameraFps),
      "-i",
      imagePath,
      "-vf",
      `scale=${cfg.cameraWidth}:${cfg.cameraHeight}:force_original_aspect_ratio=increase,crop=${cfg.cameraWidth}:${cfg.cameraHeight},setsar=1`,
      "-r",
      String(cfg.cameraFps),
      "-c:v",
      "mjpeg",
      "-q:v",
      "3",
      "-pix_fmt",
      "yuvj420p",
      "-f",
      "v4l2",
      `/dev/video${videoNr}`,
    ],
    {
      detached: true,
      stdio: ["ignore", log.fd, log.fd],
    },
  );

  child.unref();
  await fs.writeFile(pidPath, String(child.pid));
  await log.close();

  return {
    pid: child.pid,
    logPath,
    pidPath,
  };
}

export async function setRedroidCameraImage(payload = {}) {
  const cfg = config();
  const videoNr = normalizeInteger(payload.videoNr, cfg.videoNr, 0, 255, "Video device number");
  const width = normalizeInteger(payload.width, cfg.cameraWidth, 320, 4096, "Camera width");
  const height = normalizeInteger(payload.height, cfg.cameraHeight, 240, 4096, "Camera height");
  const transform = buildCameraImageFilter(width, height, {
    fitMode: payload.fitMode,
    mirror: payload.mirror,
  });
  const buffer = decodeImagePayload(payload);
  const uploadDir = path.join(cfg.workdir, "camera-images");
  const imagePath = cameraImagePathForVideo(cfg, videoNr);
  const inputPath = path.join(uploadDir, `upload-${Date.now()}.bin`);
  const outputTmp = path.join(
    path.dirname(imagePath),
    `.${path.basename(imagePath)}.${Date.now()}.tmp.png`,
  );

  await fs.mkdir(uploadDir, { recursive: true });
  await fs.mkdir(path.dirname(imagePath), { recursive: true });
  await fs.writeFile(inputPath, buffer);
  try {
    await run("ffmpeg", [
      "-nostdin",
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      inputPath,
      "-vf",
      transform.filter,
      "-frames:v",
      "1",
      outputTmp,
    ], { timeout: 30_000, maxBuffer: 2 * 1024 * 1024 });
    await fs.rename(outputTmp, imagePath);
  } finally {
    await fs.rm(inputPath, { force: true }).catch(() => {});
    await fs.rm(outputTmp, { force: true }).catch(() => {});
  }

  let restart = null;
  let managedWriter = null;

  if (Number(videoNr) === Number(cfg.videoNr)) {
    await stopManagedCameraWriter(videoNr);
    restart = await restartHostCameraService(cfg.cameraService);

    if (!restart.ok) {
      managedWriter = await startManagedCameraWriter(imagePath, videoNr, {
        ...cfg,
        cameraWidth: width,
        cameraHeight: height,
      });
    }
  } else {
    managedWriter = await startManagedCameraWriter(imagePath, videoNr, {
      ...cfg,
      cameraWidth: width,
      cameraHeight: height,
    });
    restart = {
      ok: true,
      skipped: true,
      attempts: [],
      output: `managed ffmpeg writer started for /dev/video${videoNr}`,
    };
  }

  return {
    camera: await getRedroidCameraStatus({ videoNr }),
    restart,
    managedWriter,
    transform: {
      fitMode: transform.fitMode,
      mirror: transform.mirror,
    },
  };
}
