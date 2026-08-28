import fs from "node:fs/promises";
import dns from "node:dns/promises";
import { randomBytes } from "node:crypto";
import net from "node:net";
import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

import { BACKEND_DATA_PATH } from "../config/paths.js";

const execFileAsync = promisify(execFile);

const DEFAULT_IMAGE = "redroid:13.0.0_arm64_only_extcam_rgba_blob_jpegfix_facecfg_webview109";
const DEFAULT_WORKDIR = "/root/redroid-extcam";
const DEFAULT_PROXY_IMAGE = "ghcr.io/sagernet/sing-box:v1.10.7";
const DEFAULT_PROXY_PROBE_IMAGE = "curlimages/curl:8.10.1";
const DEFAULT_GOCAPTURE_URL = "http://127.0.0.1:9081";
const PRODUCT_NAMESPACES = ["", "product", "system", "vendor", "odm"];
const CAMERA_IMAGE_FIT_MODES = new Set(["cover", "contain", "stretch"]);
const CAMERA_LENS_FACINGS = new Set(["back", "front", "external"]);
const CAMERA_SENSOR_ORIENTATIONS = new Set([0, 90, 180, 270]);
const PROXY_TYPES = new Set(["socks5", "trojan"]);
const PROXY_PROBE_TARGETS = [
  { host: "api.ipify.org", path: "/" },
  { host: "icanhazip.com", path: "/" },
  { host: "ifconfig.me", path: "/ip" },
];

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
    cameraLensFacing: normalizeCameraLensFacing(process.env.REDROID_CAMERA_LENS_FACING),
    cameraSensorOrientation: normalizeCameraSensorOrientation(
      process.env.REDROID_CAMERA_SENSOR_ORIENTATION,
    ),
    videoNr,
    adbPortBase: Number(process.env.REDROID_ADB_PORT_BASE || 5555),
    containerAdbPort: Number(process.env.REDROID_CONTAINER_ADB_PORT || 5554),
    defaultWidth: Number(process.env.REDROID_WIDTH || 720),
    defaultHeight: Number(process.env.REDROID_HEIGHT || 1280),
    defaultDpi: Number(process.env.REDROID_DPI || 320),
    defaultFps: Number(process.env.REDROID_FPS || 30),
    proxyImage: process.env.REDROID_PROXY_IMAGE || DEFAULT_PROXY_IMAGE,
    proxyProbeImage: process.env.REDROID_PROXY_PROBE_IMAGE || DEFAULT_PROXY_PROBE_IMAGE,
    proxyDir: process.env.REDROID_PROXY_DIR || path.join(workdir, "proxy"),
    proxyTunAddress: process.env.REDROID_PROXY_TUN_ADDRESS || "172.19.0.1/30",
    captureUrl: process.env.GOCAPTURE_URL || DEFAULT_GOCAPTURE_URL,
    captureToken: process.env.GOCAPTURE_WEB_TOKEN || "",
    captureHost: process.env.GOCAPTURE_PROXY_HOST || "172.17.0.1",
    captureHttpPort: Number(process.env.GOCAPTURE_HTTP_PORT || 9080),
    captureTcpPort: Number(process.env.GOCAPTURE_TCP_PORT || 9082),
    captureSocksPort: Number(process.env.REDROID_CAPTURE_SOCKS_PORT || 1080),
    captureCaPath: process.env.GOCAPTURE_CA_PATH || path.join(workdir, "gocapture-ca.pem"),
  };
}

function normalizeCameraLensFacing(value) {
  const facing = String(value || "back").trim().toLowerCase();
  return CAMERA_LENS_FACINGS.has(facing) ? facing : "back";
}

function normalizeCameraSensorOrientation(value) {
  const orientation = Number(value ?? 0);
  return CAMERA_SENSOR_ORIENTATIONS.has(orientation) ? orientation : 0;
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

function normalizeRequiredInteger(value, min, max, label) {
  if (value == null || value === "") {
    const error = new Error(`${label} is required.`);
    error.statusCode = 400;
    throw error;
  }

  return normalizeInteger(value, value, min, max, label);
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

function normalizeProxyServer(value) {
  const server = String(value ?? "").trim();
  if (!server || server.length > 253 || /[\s/'"\\]/.test(server)) {
    const error = new Error("Proxy server must be a host name or IP address.");
    error.statusCode = 400;
    throw error;
  }
  return server;
}

function normalizeProxyConfig(value = {}) {
  const enabled = normalizeBoolean(value.enabled, false, "Proxy enabled");
  const type = String(value.type || "socks5").trim().toLowerCase();

  if (!enabled) {
    return {
      enabled: false,
      type: PROXY_TYPES.has(type) ? type : "socks5",
    };
  }

  if (!PROXY_TYPES.has(type)) {
    const error = new Error("Proxy type must be socks5 or trojan.");
    error.statusCode = 400;
    throw error;
  }

  const server = normalizeProxyServer(value.server || value.host);
  const port = normalizeRequiredInteger(value.port, 1, 65535, "Proxy port");
  const username = propValue(value.username, "");
  const password = String(value.password ?? "");
  const serverName = propValue(value.serverName || value.sni || value.tlsServerName, "");
  if (type === "trojan" && !password) {
    const error = new Error("Trojan proxy password is required.");
    error.statusCode = 400;
    throw error;
  }

  return {
    enabled: true,
    type,
    server,
    port,
    username,
    password,
    serverName,
    tlsInsecure: normalizeBoolean(
      value.tlsInsecure ?? value.insecure,
      type === "trojan",
      "Proxy TLS insecure",
    ),
    captureEnabled: normalizeBoolean(
      value.captureEnabled ?? value.capture?.enabled,
      true,
      "Traffic capture enabled",
    ),
    captureMitmEnabled: normalizeBoolean(
      value.captureMitmEnabled ?? value.capture?.mitmEnabled,
      true,
      "HTTPS capture enabled",
    ),
  };
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

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\"'\"'")}'`;
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

function proxySidecarName(name) {
  return `redroid-proxy-${name}`;
}

function proxyConfigDirForName(cfg, name) {
  return path.join(cfg.proxyDir, name);
}

function proxyConfigPathForName(cfg, name) {
  return path.join(proxyConfigDirForName(cfg, name), "config.json");
}

function proxyMetaPathForName(cfg, name) {
  return path.join(proxyConfigDirForName(cfg, name), "meta.json");
}

function proxyOutbound(proxy) {
  if (proxy.type === "trojan") {
    return {
      type: "trojan",
      tag: "proxy",
      server: proxy.server,
      server_port: proxy.port,
      password: proxy.password,
      bind_interface: "eth0",
      tls: {
        enabled: true,
        insecure: proxy.tlsInsecure,
        ...(proxy.serverName ? { server_name: proxy.serverName } : {}),
      },
    };
  }

  const outbound = {
    type: "socks",
    tag: "proxy",
    server: proxy.server,
    server_port: proxy.port,
    version: "5",
    bind_interface: "eth0",
  };

  if (proxy.username) {
    outbound.username = proxy.username;
  }
  if (proxy.password) {
    outbound.password = proxy.password;
  }

  return outbound;
}

function ipCidrForSingleHost(host) {
  if (net.isIP(host) === 4) {
    return `${host}/32`;
  }
  if (net.isIP(host) === 6) {
    return `${host}/128`;
  }
  return null;
}

function buildSingBoxConfig(proxy, cfg, captureCredentials = {}) {
  const directCidrs = [
    ipCidrForSingleHost(proxy.server),
    "127.0.0.0/8",
  ].filter(Boolean);
  const captureHost = cfg.captureHost;
  const captureCidr = ipCidrForSingleHost(captureHost);
  const captureInbounds = proxy.captureEnabled
    ? [{
        type: "socks",
        tag: "capture-egress",
        listen: "0.0.0.0",
        listen_port: cfg.captureSocksPort,
        users: [{
          username: captureCredentials.username,
          password: captureCredentials.password,
        }],
      }]
    : [];
  const captureOutbounds = proxy.captureEnabled
    ? [{
        type: "http",
        tag: "capture-tcp",
        server: captureHost,
        server_port: cfg.captureTcpPort,
      }]
    : [];

  return {
    log: {
      level: "info",
      timestamp: true,
    },
    dns: {
      servers: [
        {
          tag: "proxy-dns",
          address: "8.8.8.8",
          detour: "proxy",
        },
      ],
      final: "proxy-dns",
      strategy: "ipv4_only",
    },
    inbounds: [
      {
        type: "tun",
        tag: "tun-in",
        interface_name: "tun0",
        inet4_address: cfg.proxyTunAddress,
        auto_route: false,
        strict_route: false,
        sniff: true,
        stack: "system",
      },
      ...captureInbounds,
    ],
    outbounds: [
      proxyOutbound(proxy),
      ...captureOutbounds,
      {
        type: "dns",
        tag: "dns-out",
      },
      {
        type: "direct",
        tag: "direct",
      },
      {
        type: "block",
        tag: "block",
      },
    ],
    route: {
      default_interface: "eth0",
      rules: [
        {
          protocol: "dns",
          outbound: "dns-out",
        },
        ...(directCidrs.length
          ? [{
              ip_cidr: directCidrs,
              outbound: "direct",
            }]
          : []),
        ...(proxy.captureEnabled && captureCidr
          ? [{
              ip_cidr: [captureCidr],
              outbound: "direct",
            }]
          : []),
        ...(proxy.captureEnabled
          ? [
              {
                inbound: ["capture-egress"],
                outbound: "proxy",
              },
              {
                network: "tcp",
                outbound: "capture-tcp",
              },
            ]
          : []),
      ],
      final: "proxy",
    },
  };
}

function publicProxyMeta(meta = {}) {
  return {
    enabled: Boolean(meta.enabled),
    type: meta.type ?? null,
    server: meta.server ?? null,
    port: meta.port ?? null,
    usernameSet: Boolean(meta.usernameSet),
    serverName: meta.serverName ?? null,
    tlsInsecure: Boolean(meta.tlsInsecure),
    captureEnabled: Boolean(meta.captureEnabled),
    captureMitmEnabled: Boolean(meta.captureMitmEnabled),
    sidecarName: meta.sidecarName ?? null,
    image: meta.image ?? null,
    updatedAt: meta.updatedAt ?? null,
  };
}

async function readProxyMeta(name) {
  const cfg = config();
  try {
    const raw = await fs.readFile(proxyMetaPathForName(cfg, name), "utf8");
    return publicProxyMeta(JSON.parse(raw));
  } catch {
    return {
      enabled: false,
      sidecarName: proxySidecarName(name),
      state: "absent",
      running: false,
    };
  }
}

async function writeProxyFiles(name, proxy) {
  const cfg = config();
  const dir = proxyConfigDirForName(cfg, name);
  const configPath = proxyConfigPathForName(cfg, name);
  const metaPath = proxyMetaPathForName(cfg, name);
  const sidecarName = proxySidecarName(name);
  const captureSocksUsername = name;
  const captureSocksPassword = randomBytes(24).toString("base64url");
  const meta = {
    enabled: true,
    type: proxy.type,
    server: proxy.server,
    port: proxy.port,
    usernameSet: Boolean(proxy.username),
    serverName: proxy.serverName,
    tlsInsecure: proxy.tlsInsecure,
    captureEnabled: proxy.captureEnabled,
    captureMitmEnabled: proxy.captureMitmEnabled,
    captureSocksUsername,
    captureSocksPassword,
    sidecarName,
    image: cfg.proxyImage,
    configPath,
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(configPath, `${JSON.stringify(buildSingBoxConfig(proxy, cfg, {
    username: captureSocksUsername,
    password: captureSocksPassword,
  }), null, 2)}\n`, {
    mode: 0o600,
  });
  await fs.writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, { mode: 0o600 });

  return meta;
}

function captureRule(rule, cfg) {
  const captureCidr = ipCidrForSingleHost(cfg.captureHost);
  return (
    rule?.outbound === "capture-tcp" ||
    (Array.isArray(rule?.inbound) && rule.inbound.includes("capture-egress")) ||
    (captureCidr && rule?.outbound === "direct" &&
      Array.isArray(rule?.ip_cidr) && rule.ip_cidr.length === 1 && rule.ip_cidr[0] === captureCidr)
  );
}

function setCaptureInSingBoxConfig(document, enabled, cfg, captureCredentials = {}) {
  const configDocument = structuredClone(document);
  configDocument.inbounds = (configDocument.inbounds ?? [])
    .filter((item) => item?.tag !== "capture-egress");
  configDocument.outbounds = (configDocument.outbounds ?? [])
    .filter((item) => item?.tag !== "capture-tcp");
  configDocument.route ??= {};
  configDocument.route.rules = (configDocument.route.rules ?? [])
    .filter((rule) => !captureRule(rule, cfg));

  if (!enabled) {
    return configDocument;
  }

  configDocument.inbounds.push({
    type: "socks",
    tag: "capture-egress",
    listen: "0.0.0.0",
    listen_port: cfg.captureSocksPort,
    users: [{
      username: captureCredentials.username,
      password: captureCredentials.password,
    }],
  });
  configDocument.outbounds.splice(1, 0, {
    type: "http",
    tag: "capture-tcp",
    server: cfg.captureHost,
    server_port: cfg.captureTcpPort,
  });
  const captureCidr = ipCidrForSingleHost(cfg.captureHost);
  if (captureCidr) {
    configDocument.route.rules.push({
      ip_cidr: [captureCidr],
      outbound: "direct",
    });
  }
  configDocument.route.rules.push(
    {
      inbound: ["capture-egress"],
      outbound: "proxy",
    },
    {
      network: "tcp",
      outbound: "capture-tcp",
    },
  );
  return configDocument;
}

async function setCaptureEnabledInProxyFiles(name, enabled, mitmEnabled) {
  const cfg = config();
  const configPath = proxyConfigPathForName(cfg, name);
  const metaPath = proxyMetaPathForName(cfg, name);
  let document;
  let meta;
  try {
    [document, meta] = await Promise.all([
      fs.readFile(configPath, "utf8").then(JSON.parse),
      fs.readFile(metaPath, "utf8").then(JSON.parse),
    ]);
  } catch (error) {
    const wrapped = new Error(`Proxy configuration for ${name} is unavailable.`);
    wrapped.statusCode = 409;
    wrapped.cause = error;
    throw wrapped;
  }

  const captureSocksUsername = meta.captureSocksUsername || name;
  const captureSocksPassword = meta.captureSocksPassword || randomBytes(24).toString("base64url");
  const updatedDocument = setCaptureInSingBoxConfig(document, enabled, cfg, {
    username: captureSocksUsername,
    password: captureSocksPassword,
  });
  const updatedMeta = {
    ...meta,
    captureEnabled: Boolean(enabled),
    captureMitmEnabled: Boolean(enabled && mitmEnabled),
    captureSocksUsername,
    captureSocksPassword,
    updatedAt: new Date().toISOString(),
  };
  await Promise.all([
    fs.writeFile(configPath, `${JSON.stringify(updatedDocument, null, 2)}\n`, { mode: 0o600 }),
    fs.writeFile(metaPath, `${JSON.stringify(updatedMeta, null, 2)}\n`, { mode: 0o600 }),
  ]);
  return updatedMeta;
}

async function goCaptureRequest(pathname, options = {}) {
  const cfg = config();
  const headers = { ...(options.headers ?? {}) };
  if (cfg.captureToken) {
    headers.Authorization = `Bearer ${cfg.captureToken}`;
  }
  if (options.body != null) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(new URL(pathname, cfg.captureUrl), {
    method: options.method ?? "GET",
    headers,
    body: options.body == null ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(options.timeout ?? 10_000),
  });
  if (!response.ok) {
    const detail = (await response.text()).trim();
    throw new Error(`GoCapture ${pathname} returned HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  if (options.binary) {
    return Buffer.from(await response.arrayBuffer());
  }
  return response.json();
}

async function syncGoCaptureEgress() {
  const instances = await listRedroidInstances();
  const current = await goCaptureRequest("/api/egress");
  const managedNodePrefix = "redroid-";
  const nodes = (current.nodes ?? []).filter((node) => !String(node.id).startsWith(managedNodePrefix));
  const rules = (current.rules ?? []).filter((rule) =>
    !String(rule.nodeId).startsWith(managedNodePrefix));

  for (const instance of instances) {
    if (!instance.running || !instance.ipAddress || !instance.proxy?.enabled ||
        !instance.proxy?.running || !instance.proxy?.captureEnabled) {
      continue;
    }
    const nodeId = `${managedNodePrefix}${instance.name}`.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64);
    const privateMeta = await fs.readFile(
      proxyMetaPathForName(config(), instance.name),
      "utf8",
    ).then(JSON.parse);
    const socksUser = encodeURIComponent(privateMeta.captureSocksUsername || instance.name);
    const socksPassword = encodeURIComponent(privateMeta.captureSocksPassword || "");
    nodes.push({
      id: nodeId,
      name: `${instance.name} 独立出口`,
      url: `socks5://${socksUser}:${socksPassword}@${instance.ipAddress}:${config().captureSocksPort}`,
    });
    rules.push({ source: instance.ipAddress, nodeId });
  }

  const updated = await goCaptureRequest("/api/egress", {
    method: "PUT",
    body: {
      enabled: nodes.length > 0 || Boolean(current.enabled),
      defaultNodeId: String(current.defaultNodeId ?? "").startsWith(managedNodePrefix)
        ? ""
        : current.defaultNodeId ?? "",
      nodes,
      rules,
    },
  });
  return {
    ok: true,
    managedDevices: rules.filter((rule) => String(rule.nodeId).startsWith(managedNodePrefix)).length,
    enabled: Boolean(updated.enabled),
  };
}

async function installGoCaptureCA(name) {
  const cfg = config();
  const certificate = await goCaptureRequest("/api/certificate", { binary: true });
  await fs.mkdir(path.dirname(cfg.captureCaPath), { recursive: true });
  await fs.writeFile(cfg.captureCaPath, certificate, { mode: 0o644 });
  const { stdout } = await run("openssl", ["x509", "-subject_hash_old", "-noout", "-in", cfg.captureCaPath]);
  const hash = stdout.trim().split(/\s+/)[0];
  if (!/^[0-9a-fA-F]{8}$/.test(hash)) {
    throw new Error("GoCapture CA subject hash is invalid.");
  }
  const destination = `/system/etc/security/cacerts/${hash}.0`;
  await runDocker(["cp", cfg.captureCaPath, `${name}:${destination}`], { timeout: 15_000 });
  await runDocker(["exec", name, "chmod", "0644", destination], { timeout: 10_000 });
  await commandResult("docker", ["exec", name, "restorecon", destination], { timeout: 10_000 });
  return { ok: true, destination, hash };
}

async function configureAndroidCapture(name, enabled) {
  const cfg = config();
  if (!enabled) {
    const result = await commandResult("docker", ["exec", name, "settings", "delete", "global", "http_proxy"], { timeout: 10_000 });
    let caRemoval = { ok: true, skipped: true };
    if (await fs.stat(cfg.captureCaPath).then(() => true).catch(() => false)) {
      const hashResult = await commandResult("openssl", [
        "x509", "-subject_hash_old", "-noout", "-in", cfg.captureCaPath,
      ]);
      const hash = hashResult.stdout.trim().split(/\s+/)[0];
      if (/^[0-9a-fA-F]{8}$/.test(hash)) {
        caRemoval = await commandResult("docker", [
          "exec", name, "rm", "-f", `/system/etc/security/cacerts/${hash}.0`,
        ], { timeout: 10_000 });
      }
    }
    return { ok: result.ok && caRemoval.ok, enabled: false, output: result.output, caRemoval };
  }
  const ca = await installGoCaptureCA(name);
  const proxyAddress = `${cfg.captureHost}:${cfg.captureHttpPort}`;
  const result = await commandResult("docker", ["exec", name, "settings", "put", "global", "http_proxy", proxyAddress], { timeout: 10_000 });
  return { ok: result.ok, enabled: true, proxyAddress, ca, output: result.output };
}

async function ensureDockerImage(image) {
  const inspect = await commandResult("docker", ["image", "inspect", image], {
    timeout: 15_000,
    maxBuffer: 1024 * 1024,
  });
  if (inspect.ok) {
    return {
      image,
      pulled: false,
      inspect,
    };
  }

  const pull = await commandResult("docker", ["pull", image], {
    timeout: 180_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  return {
    image,
    pulled: pull.ok,
    inspect,
    pull,
  };
}

async function inspectDockerContainer(name) {
  const { stdout } = await runDocker(["inspect", name], {
    timeout: 15_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  return JSON.parse(stdout)[0];
}

function containerGateway(inspect) {
  const networks = Object.values(inspect?.NetworkSettings?.Networks ?? {});
  return networks.find((network) => network?.Gateway)?.Gateway ?? "";
}

async function restoreContainerDefaultRoutes(name) {
  const inspect = await inspectDockerContainer(name).catch(() => null);
  const pid = Number(inspect?.State?.Pid ?? 0);
  const gateway = containerGateway(inspect);
  if (!pid || !gateway) {
    return {
      ok: false,
      skipped: true,
      reason: "container network namespace is not available",
    };
  }

  const commands = [
    ["ip", "route", "replace", "default", "via", gateway, "dev", "eth0"],
    ["ip", "route", "replace", "table", "1002", "default", "via", gateway, "dev", "eth0"],
  ];
  const results = [];
  for (const command of commands) {
    results.push(await commandResult("nsenter", [
      "-t",
      String(pid),
      "-n",
      ...command,
    ], { timeout: 5_000 }));
  }

  return {
    ok: results.some((result) => result.ok),
    pid,
    gateway,
    results,
  };
}

async function waitForTunInterface(name, interfaceName = "tun0") {
  const inspect = await inspectDockerContainer(name);
  const pid = Number(inspect?.State?.Pid ?? 0);
  if (!pid) {
    const error = new Error(`Container ${name} has no running network namespace.`);
    error.statusCode = 409;
    throw error;
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const result = await commandResult("nsenter", [
      "-t",
      String(pid),
      "-n",
      "ip",
      "link",
      "show",
      interfaceName,
    ], { timeout: 1_500 });
    if (result.ok) {
      return {
        ok: true,
        pid,
        interfaceName,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const error = new Error(`Proxy TUN interface ${interfaceName} did not appear in ${name}.`);
  error.statusCode = 500;
  throw error;
}

async function configureContainerProxyRoutes(name, proxyServer, captureEnabled = false) {
  const inspect = await inspectDockerContainer(name);
  const pid = Number(inspect?.State?.Pid ?? 0);
  const gateway = containerGateway(inspect);
  const proxyCidr = ipCidrForSingleHost(proxyServer);
  const captureCidr = captureEnabled ? ipCidrForSingleHost(config().captureHost) : null;
  if (!pid || !gateway) {
    const error = new Error(`Container ${name} network namespace is not available.`);
    error.statusCode = 409;
    throw error;
  }

  await waitForTunInterface(name);

  const commands = [
    proxyCidr ? ["ip", "route", "replace", proxyCidr, "via", gateway, "dev", "eth0"] : null,
    captureCidr ? ["ip", "route", "replace", captureCidr, "dev", "eth0"] : null,
    ["ip", "route", "replace", "default", "dev", "tun0"],
    proxyCidr ? ["ip", "route", "replace", "table", "1002", proxyCidr, "via", gateway, "dev", "eth0"] : null,
    captureCidr ? ["ip", "route", "replace", "table", "1002", captureCidr, "dev", "eth0"] : null,
    ["ip", "route", "replace", "table", "1002", "default", "dev", "tun0"],
  ].filter(Boolean);
  const results = [];
  for (const command of commands) {
    results.push(await commandResult("nsenter", [
      "-t",
      String(pid),
      "-n",
      ...command,
    ], { timeout: 5_000 }));
  }

  return {
    ok: results.every((result) => result.ok),
    pid,
    gateway,
    proxyCidr,
    captureCidr,
    results,
  };
}

async function inspectProxySidecars() {
  const list = await commandResult("docker", [
    "ps",
    "-a",
    "--filter",
    "label=cloud-phone.redroid.proxy=1",
    "--format",
    "{{.Names}}",
  ], { maxBuffer: 1024 * 1024 });

  if (!list.ok) {
    return new Map();
  }

  const names = list.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!names.length) {
    return new Map();
  }

  const { stdout } = await runDocker(["inspect", ...names], {
    maxBuffer: 8 * 1024 * 1024,
  });
  const sidecars = JSON.parse(stdout);
  const byInstance = new Map();
  for (const sidecar of sidecars) {
    const labels = sidecar?.Config?.Labels ?? {};
    const proxyFor = labels["cloud-phone.redroid.proxyFor"];
    if (!proxyFor) {
      continue;
    }
    byInstance.set(proxyFor, {
      sidecarName: String(sidecar?.Name ?? "").replace(/^\//, ""),
      state: sidecar?.State?.Status ?? "unknown",
      running: Boolean(sidecar?.State?.Running),
      exitCode: sidecar?.State?.ExitCode ?? null,
      image: sidecar?.Config?.Image ?? null,
      createdAt: sidecar?.Created ?? null,
    });
  }

  return byInstance;
}

async function enrichInstancesWithProxy(instances) {
  const sidecars = await inspectProxySidecars();
  return Promise.all(instances.map(async (instance) => {
    const meta = await readProxyMeta(instance.name);
    const sidecar = sidecars.get(instance.name);
    return {
      ...instance,
      proxy: {
        ...meta,
        sidecarName: meta.sidecarName || sidecar?.sidecarName || proxySidecarName(instance.name),
        state: sidecar?.state ?? "absent",
        running: Boolean(sidecar?.running),
        exitCode: sidecar?.exitCode ?? null,
        image: sidecar?.image ?? meta.image ?? null,
        createdAt: sidecar?.createdAt ?? null,
      },
    };
  }));
}

async function startProxySidecarFromMeta(name, meta) {
  const cfg = config();
  const sidecarName = meta.sidecarName || proxySidecarName(name);
  const configPath = meta.configPath || proxyConfigPathForName(cfg, name);
  const image = meta.image || cfg.proxyImage;

  await inspectDockerContainer(name);
  await ensureDockerImage(image);
  await commandResult("docker", ["rm", "-f", sidecarName], { timeout: 30_000 });
  await restoreContainerDefaultRoutes(name);

  const labels = [
    "cloud-phone.redroid.proxy=1",
    `cloud-phone.redroid.proxyFor=${name}`,
    `cloud-phone.redroid.proxyType=${meta.type || ""}`,
    `cloud-phone.redroid.proxyServer=${meta.server || ""}`,
    `cloud-phone.redroid.proxyPort=${meta.port || ""}`,
  ];
  const args = [
    "run",
    "-d",
    "--name",
    sidecarName,
    "--restart",
    "unless-stopped",
    "--network",
    `container:${name}`,
    "--cap-add",
    "NET_ADMIN",
    "--device",
    "/dev/net/tun:/dev/net/tun",
    "-v",
    `${configPath}:/etc/sing-box/config.json:ro`,
  ];

  for (const label of labels) {
    args.push("--label", label);
  }

  args.push(image, "run", "-c", "/etc/sing-box/config.json");

  const { stdout } = await runDocker(args, { timeout: 60_000 });
  const routes = await configureContainerProxyRoutes(name, meta.server, meta.captureEnabled);
  const capture = meta.captureEnabled
    ? {
        egress: await syncGoCaptureEgress().catch((error) => ({ ok: false, error: error.message })),
        android: await configureAndroidCapture(name, Boolean(meta.captureMitmEnabled))
          .catch((error) => ({ ok: false, error: error.message })),
      }
    : null;
  return {
    ok: true,
    sidecarName,
    containerId: stdout.trim(),
    image,
    routes,
    capture,
  };
}

async function stopProxySidecar(name) {
  const sidecarName = proxySidecarName(name);
  const capture = await configureAndroidCapture(name, false).catch((error) => ({ ok: false, error: error.message }));
  const routes = await restoreContainerDefaultRoutes(name);
  const result = await commandResult("docker", ["rm", "-f", sidecarName], {
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  });
  const egress = await syncGoCaptureEgress().catch((error) => ({ ok: false, error: error.message }));
  return {
    ok: result.ok || /No such container/i.test(result.output),
    sidecarName,
    output: result.output,
    routes,
    capture,
    egress,
  };
}

function extractPort(inspect) {
  const ports = inspect?.NetworkSettings?.Ports ?? {};
  const labels = inspect?.Config?.Labels ?? {};
  const containerAdbPort = labels["cloud-phone.redroid.containerAdbPort"] || "5554";
  const candidates = [`${containerAdbPort}/tcp`, "5554/tcp", "5555/tcp"];

  for (const candidate of candidates) {
    const bindings = ports[candidate];
    if (bindings?.[0]?.HostPort) {
      return Number(bindings[0].HostPort);
    }
  }

  return labels["cloud-phone.redroid.adbPort"] ? Number(labels["cloud-phone.redroid.adbPort"]) : null;
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
    ipAddress: Object.values(inspect?.NetworkSettings?.Networks ?? {})
      .find((network) => network?.IPAddress)?.IPAddress ?? null,
    gateway: containerGateway(inspect) || null,
    adbPort: extractPort(inspect),
    containerAdbPort: Number(labels["cloud-phone.redroid.containerAdbPort"] || 5554),
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
    proxy: {
      enabled: false,
      sidecarName: proxySidecarName(String(inspect?.Name ?? "").replace(/^\//, "")),
      state: "absent",
      running: false,
    },
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
    cameraLensFacing: cfg.cameraLensFacing,
    cameraSensorOrientation: cfg.cameraSensorOrientation,
    defaultVideoNr: cfg.videoNr,
    defaultAdbPortBase: cfg.adbPortBase,
    containerAdbPort: cfg.containerAdbPort,
    proxyImage: cfg.proxyImage,
    proxyDir: cfg.proxyDir,
    captureUrl: cfg.captureUrl,
    captureHttpPort: cfg.captureHttpPort,
    captureTcpPort: cfg.captureTcpPort,
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
      if (normalizedName.startsWith("cloud-phone") || normalizedName.startsWith("redroid-proxy-")) {
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

  return enrichInstancesWithProxy(await inspectContainers(names));
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
  const proxy = normalizeProxyConfig(payload.proxy ?? {});

  await fs.mkdir(dataDir, { recursive: true });
  await runDocker(["image", "inspect", image], { timeout: 15_000 });

  const labels = [
    "cloud-phone.redroid=1",
    `cloud-phone.redroid.adbPort=${adbPort}`,
    `cloud-phone.redroid.containerAdbPort=${cfg.containerAdbPort}`,
    `cloud-phone.redroid.videoNr=${videoNr}`,
    `cloud-phone.redroid.brand=${propValue(model.brand || model.manufacturer, "Google")}`,
    `cloud-phone.redroid.manufacturer=${propValue(model.manufacturer || model.brand, "Google")}`,
    `cloud-phone.redroid.modelCode=${propValue(model.modelCode || model.model, "G-2PW4100")}`,
    `cloud-phone.redroid.marketingName=${propValue(model.marketingName, "")}`,
    `cloud-phone.redroid.device=${propToken(model.device || model.codename, "sailfish")}`,
    `cloud-phone.redroid.productName=${propToken(model.productName || model.name, "sailfish")}`,
  ];
  if (proxy.enabled) {
    labels.push(
      "cloud-phone.redroid.proxy.enabled=1",
      `cloud-phone.redroid.proxy.type=${proxy.type}`,
      `cloud-phone.redroid.proxy.server=${proxy.server}`,
      `cloud-phone.redroid.proxy.port=${proxy.port}`,
    );
  }

  const bootArgs = [
    "androidboot.use_memfd=true",
    `androidboot.redroid_width=${width}`,
    `androidboot.redroid_height=${height}`,
    `androidboot.redroid_dpi=${dpi}`,
    `androidboot.redroid_fps=${fps}`,
    "androidboot.redroid_gpu_mode=guest",
    `service.adb.tcp.port=${cfg.containerAdbPort}`,
    `persist.adb.tcp.port=${cfg.containerAdbPort}`,
    "persist.sys.usb.config=adb",
    "ro.product.locale=zh-CN",
    "persist.sys.locale=zh-CN",
    `ro.vendor.camera.external.lensFacing=${propToken(cfg.cameraLensFacing, "back")}`,
    `ro.vendor.camera.external.sensorOrientation=${cfg.cameraSensorOrientation}`,
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
    `${adbPort}:${cfg.containerAdbPort}`,
    "--device",
    `/dev/video${videoNr}:/dev/video${videoNr}`,
  ];

  for (const label of labels) {
    args.push("--label", label);
  }

  args.push(image, ...bootArgs);

  const { stdout } = await runDocker(args, { timeout: 60_000 });
  let proxyStart = null;
  if (proxy.enabled) {
    const meta = await writeProxyFiles(name, proxy);
    try {
      proxyStart = await startProxySidecarFromMeta(name, meta);
    } catch (error) {
      proxyStart = {
        ok: false,
        sidecarName: meta.sidecarName,
        error: error instanceof Error ? error.message : String(error ?? ""),
      };
    }
  }
  const [instance] = await enrichInstancesWithProxy(await inspectContainers([name]));

  return {
    containerId: stdout.trim(),
    instance,
    proxy: proxyStart,
  };
}

export async function ensureRedroidAdbd(name) {
  const safeName = assertName(name);
  return commandResult("docker", [
    "exec",
    safeName,
    "sh",
    "-c",
    "boot=$(getprop sys.boot_completed); state=$(getprop init.svc.adbd); if [ \"$boot\" = \"1\" ] && [ \"$state\" != \"running\" ]; then setprop ctl.start adbd; sleep 1; state=$(getprop init.svc.adbd); fi; printf 'boot=%s adbd=%s\\n' \"$boot\" \"$state\"",
  ], { timeout: 8_000 });
}

export async function connectManagedRedroidAdbTargets(adbPath) {
  if (process.env.REDROID_ADB_AUTO_CONNECT === "0") {
    return [];
  }

  const instances = await listRedroidInstances().catch(() => []);
  const results = [];

  for (const instance of instances) {
    if (!instance.running || !instance.adbPort) {
      continue;
    }

    const adbd = await ensureRedroidAdbd(instance.name);
    const target = `127.0.0.1:${instance.adbPort}`;
    const connect = await commandResult(adbPath, ["connect", target], {
      timeout: 4_000,
      maxBuffer: 1024 * 1024,
    });

    results.push({
      name: instance.name,
      target,
      adbd,
      connect,
    });
  }

  return results;
}

export async function startRedroidInstance(name) {
  const safeName = assertName(name);
  const { stdout, stderr } = await runDocker(["start", safeName], { timeout: 30_000 });
  const meta = await readProxyMeta(safeName);
  let proxy = null;
  if (meta.enabled) {
    try {
      proxy = await startProxySidecarFromMeta(safeName, meta);
    } catch (error) {
      proxy = {
        ok: false,
        sidecarName: meta.sidecarName,
        error: error instanceof Error ? error.message : String(error ?? ""),
      };
    }
  }
  return { name: safeName, output: `${stdout}\n${stderr}`.trim(), proxy };
}

export async function stopRedroidInstance(name) {
  const safeName = assertName(name);
  const proxy = await stopProxySidecar(safeName);
  const { stdout, stderr } = await runDocker(["stop", safeName], { timeout: 60_000 });
  return { name: safeName, output: `${stdout}\n${stderr}`.trim(), proxy };
}

export async function deleteRedroidInstance(name, options = {}) {
  const safeName = assertName(name);
  const [before] = await inspectContainers([safeName]).catch(() => []);
  const proxy = await stopProxySidecar(safeName);
  const { stdout, stderr } = await runDocker(["rm", "-f", safeName], { timeout: 60_000 });

  if (options.removeData && before?.dataDir?.startsWith(`${config().workdir}/data-`)) {
    await fs.rm(before.dataDir, { recursive: true, force: true });
  }
  await fs.rm(proxyConfigDirForName(config(), safeName), { recursive: true, force: true });

  return {
    name: safeName,
    removedData: Boolean(options.removeData && before?.dataDir),
    proxy,
    output: `${stdout}\n${stderr}`.trim(),
  };
}

export async function configureRedroidInstanceProxy(name, payload = {}) {
  const safeName = assertName(name);
  const proxy = normalizeProxyConfig(payload);

  if (!proxy.enabled) {
    const stopped = await stopProxySidecar(safeName);
    await fs.rm(proxyConfigDirForName(config(), safeName), { recursive: true, force: true });
    const [instance] = await enrichInstancesWithProxy(await inspectContainers([safeName]));
    return {
      name: safeName,
      disabled: true,
      proxy: stopped,
      instance,
    };
  }

  const [instance] = await inspectContainers([safeName]);
  if (!instance) {
    const error = new Error(`ReDroid container ${safeName} was not found.`);
    error.statusCode = 404;
    throw error;
  }
  if (!instance.running) {
    const error = new Error(`ReDroid container ${safeName} must be running before enabling proxy.`);
    error.statusCode = 409;
    throw error;
  }

  const meta = await writeProxyFiles(safeName, proxy);
  let started;
  try {
    started = await startProxySidecarFromMeta(safeName, meta);
  } catch (error) {
    started = {
      ok: false,
      sidecarName: meta.sidecarName,
      error: error instanceof Error ? error.message : String(error ?? ""),
    };
  }

  const [updated] = await enrichInstancesWithProxy(await inspectContainers([safeName]));
  return {
    name: safeName,
    disabled: false,
    proxy: started,
    instance: updated,
  };
}

export async function configureRedroidInstanceCapture(name, payload = {}) {
  const safeName = assertName(name);
  const enabled = normalizeBoolean(payload.enabled, true, "Traffic capture enabled");
  const [instance] = await enrichInstancesWithProxy(await inspectContainers([safeName]));
  if (!instance) {
    const error = new Error(`ReDroid container ${safeName} was not found.`);
    error.statusCode = 404;
    throw error;
  }
  if (!instance.proxy?.enabled) {
    const error = new Error(`Configure an independent proxy for ${safeName} before enabling capture.`);
    error.statusCode = 409;
    throw error;
  }

  const privateMeta = await fs.readFile(
    proxyMetaPathForName(config(), safeName),
    "utf8",
  ).then(JSON.parse);
  const mitmEnabled = enabled && normalizeBoolean(
    payload.mitmEnabled,
    privateMeta.captureMitmEnabled ?? true,
    "HTTPS capture enabled",
  );
  const meta = await setCaptureEnabledInProxyFiles(safeName, enabled, mitmEnabled);
  let restarted = null;
  if (instance.running) {
    restarted = await startProxySidecarFromMeta(safeName, meta);
  } else {
    await configureAndroidCapture(safeName, false).catch(() => null);
    await syncGoCaptureEgress().catch(() => null);
  }
  const [updated] = await enrichInstancesWithProxy(await inspectContainers([safeName]));
  return {
    name: safeName,
    enabled,
    mitmEnabled,
    restarted,
    instance: updated,
  };
}

export async function checkRedroidInstanceProxy(name) {
  const safeName = assertName(name);
  const cfg = config();
  const [instance] = await enrichInstancesWithProxy(await inspectContainers([safeName]));
  if (!instance) {
    const error = new Error(`ReDroid container ${safeName} was not found.`);
    error.statusCode = 404;
    throw error;
  }

  await ensureDockerImage(cfg.proxyProbeImage);
  const attempts = [];

  for (const target of PROXY_PROBE_TARGETS) {
    const probeHost = target.host;
    const probeIp = await dns.resolve4(probeHost).then((items) => items[0]).catch(() => "");
    const probeArgs = [
      "run",
      "--rm",
      "--network",
      `container:${safeName}`,
      cfg.proxyProbeImage,
      "-fsS",
      "--connect-timeout",
      "8",
      "--max-time",
      "20",
      "--retry",
      "1",
      "--retry-delay",
      "1",
      "--retry-all-errors",
    ];
    if (probeIp) {
      probeArgs.push("--resolve", `${probeHost}:443:${probeIp}`);
    }
    probeArgs.push(`https://${probeHost}${target.path}`);

    const result = await commandResult("docker", probeArgs, {
      timeout: 35_000,
      maxBuffer: 1024 * 1024,
    });
    const exitIp = result.ok ? String(result.stdout ?? "").trim().split(/\s+/)[0] : "";
    const attempt = {
      ok: Boolean(result.ok && net.isIP(exitIp)),
      exitIp: net.isIP(exitIp) ? exitIp : "",
      probeHost,
      probeIp,
      output: result.output,
    };
    attempts.push(attempt);

    if (attempt.ok) {
      return {
        name: safeName,
        ok: true,
        exitIp: attempt.exitIp,
        probeHost: attempt.probeHost,
        probeIp: attempt.probeIp,
        attempts,
        output: attempt.output,
        proxy: instance.proxy,
      };
    }
  }

  const lastAttempt = attempts.at(-1) ?? {
    probeHost: "",
    probeIp: "",
    output: "",
  };

  return {
    name: safeName,
    ok: false,
    exitIp: "",
    probeHost: lastAttempt.probeHost,
    probeIp: lastAttempt.probeIp,
    attempts,
    output: attempts.map((item) => `${item.probeHost}: ${item.output}`).join("\n\n"),
    proxy: instance.proxy,
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

async function writeHostCameraServiceConfig({ videoNr, width, height, fps, imagePath }) {
  const content = [
    `VIDEO_NR=${videoNr}`,
    `CAMERA_WIDTH=${width}`,
    `CAMERA_HEIGHT=${height}`,
    `CAMERA_FPS=${fps}`,
    `CAMERA_IMAGE=${imagePath}`,
    "CAMERA_JPEG_Q=1",
    "",
  ].join("\n");
  const script = [
    "umask 022",
    "mkdir -p /etc/default",
    `printf %s ${shellQuote(content)} > /etc/default/redroid-static-camera`,
  ].join("; ");

  const attempts = [
    await commandResult("nsenter", [
      "--target",
      "1",
      "--mount",
      "--uts",
      "--ipc",
      "--net",
      "--pid",
      "/bin/sh",
      "-c",
      script,
    ], { timeout: 8_000 }),
    await commandResult("/bin/sh", ["-c", script], { timeout: 8_000 }),
  ];

  return {
    ok: attempts.some((item) => item.ok),
    path: "/etc/default/redroid-static-camera",
    content,
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
      "1",
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
  let serviceConfig = null;

  if (Number(videoNr) === Number(cfg.videoNr)) {
    await stopManagedCameraWriter(videoNr);
    serviceConfig = await writeHostCameraServiceConfig({
      videoNr,
      width,
      height,
      fps: cfg.cameraFps,
      imagePath,
    });
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
    serviceConfig,
    transform: {
      fitMode: transform.fitMode,
      mirror: transform.mirror,
    },
  };
}
