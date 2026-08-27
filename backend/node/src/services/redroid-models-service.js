import fs from "node:fs/promises";
import https from "node:https";
import path from "node:path";

import { BACKEND_DATA_PATH } from "../config/paths.js";

const CACHE_PATH = path.join(BACKEND_DATA_PATH, "mobile-models-cache.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_MODELS = 5000;

const MODEL_SOURCES = [
  { key: "google", manufacturer: "Google", file: "brands/google.md" },
  { key: "samsung", manufacturer: "Samsung", file: "brands/samsung_global_en.md" },
  { key: "xiaomi", manufacturer: "Xiaomi", file: "brands/xiaomi_en.md" },
  { key: "oneplus", manufacturer: "OnePlus", file: "brands/oneplus_en.md" },
  { key: "oppo", manufacturer: "OPPO", file: "brands/oppo_global_en.md" },
  { key: "vivo", manufacturer: "vivo", file: "brands/vivo_global_en.md" },
  { key: "realme", manufacturer: "realme", file: "brands/realme_global_en.md" },
  { key: "huawei", manufacturer: "HUAWEI", file: "brands/huawei_global_en.md" },
  { key: "honor", manufacturer: "HONOR", file: "brands/honor_global_en.md" },
  { key: "nothing", manufacturer: "Nothing", file: "brands/nothing.md" },
];

const MOBILE_MODELS_RAW_BASE =
  "https://raw.githubusercontent.com/KHwang9883/MobileModels/master";

const FALLBACK_MODELS = [
  {
    id: "google:G-2PW4100:sailfish",
    source: "fallback",
    brand: "Google",
    manufacturer: "Google",
    modelCode: "G-2PW4100",
    marketingName: "Pixel",
    codename: "sailfish",
    device: "sailfish",
    productName: "sailfish",
    label: "Google Pixel (G-2PW4100)",
  },
  {
    id: "google:GPJ41:shiba",
    source: "fallback",
    brand: "Google",
    manufacturer: "Google",
    modelCode: "GPJ41",
    marketingName: "Pixel 8",
    codename: "shiba",
    device: "shiba",
    productName: "shiba",
    label: "Google Pixel 8 Global (GPJ41)",
  },
  {
    id: "samsung:SM-S911B:dm1q",
    source: "fallback",
    brand: "Samsung",
    manufacturer: "Samsung",
    modelCode: "SM-S911B",
    marketingName: "Galaxy S23 Global",
    codename: "dm1q",
    device: "dm1q",
    productName: "dm1q",
    label: "Samsung Galaxy S23 Global (SM-S911B)",
  },
];

function normalizeDeviceName(value, fallback = "redroid") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function stripMarkdown(value) {
  return String(value ?? "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "Cloud-Phone ReDroid model importer",
          Accept: "text/plain",
        },
        timeout: 15_000,
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }

        const chunks = [];
        res.setEncoding("utf8");
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(chunks.join("")));
      },
    );

    req.on("timeout", () => {
      req.destroy(new Error(`Timeout fetching ${url}`));
    });
    req.on("error", reject);
  });
}

function parseBrandMarkdown(source, markdown) {
  const models = [];
  let current = null;

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const sectionMatch = line.match(/^\*\*(.+?)(?:\s+\(`([^`]+)`\))?:\*\*$/);
    if (sectionMatch) {
      current = {
        marketingName: stripMarkdown(sectionMatch[1]),
        codename: stripMarkdown(sectionMatch[2] ?? ""),
      };
      continue;
    }

    if (!line.startsWith("`") || !line.includes(":")) {
      continue;
    }

    const [codesPart, descriptionPart = ""] = line.split(/:\s*/, 2);
    const codes = [...codesPart.matchAll(/`([^`]+)`/g)]
      .map((match) => stripMarkdown(match[1]))
      .filter(Boolean);

    if (!codes.length) {
      continue;
    }

    const description = stripMarkdown(descriptionPart);
    const marketingName = description || current?.marketingName || codes[0];
    const codename = current?.codename || normalizeDeviceName(marketingName);
    const device = normalizeDeviceName(codename, normalizeDeviceName(codes[0]));

    for (const code of codes) {
      models.push({
        id: `${source.key}:${code}:${device}`,
        source: "MobileModels",
        brand: source.manufacturer,
        manufacturer: source.manufacturer,
        modelCode: code,
        marketingName,
        codename,
        device,
        productName: device,
        label: `${source.manufacturer} ${marketingName} (${code})`,
      });
    }
  }

  return models;
}

async function readCache() {
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    const age = Date.now() - Date.parse(parsed.updatedAt ?? 0);

    if (Number.isFinite(age) && age >= 0 && age < CACHE_TTL_MS && Array.isArray(parsed.models)) {
      return parsed;
    }
  } catch {
    // Cache misses are expected on first startup.
  }

  return null;
}

async function writeCache(payload) {
  await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await fs.writeFile(CACHE_PATH, JSON.stringify(payload, null, 2));
}

async function loadFromMobileModels() {
  const settled = await Promise.allSettled(
    MODEL_SOURCES.map(async (source) => {
      const markdown = await fetchText(`${MOBILE_MODELS_RAW_BASE}/${source.file}`);
      return parseBrandMarkdown(source, markdown);
    }),
  );

  const models = settled
    .flatMap((item) => (item.status === "fulfilled" ? item.value : []))
    .slice(0, MAX_MODELS);

  if (!models.length) {
    throw new Error("No models parsed from MobileModels.");
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    source: "https://github.com/KHwang9883/MobileModels",
    sourceLicense: "CC BY-NC-SA 4.0",
    models,
  };
  await writeCache(payload);
  return payload;
}

export async function listRedroidModelPresets(options = {}) {
  const query = String(options.query ?? "").trim().toLowerCase();
  const brand = String(options.brand ?? "").trim().toLowerCase();
  const limit = Math.min(Math.max(Number(options.limit) || 80, 1), 300);

  let payload = null;

  if (!options.refresh) {
    payload = await readCache();
  }

  if (!payload) {
    try {
      payload = await loadFromMobileModels();
    } catch (error) {
      payload = {
        updatedAt: new Date().toISOString(),
        source: "fallback",
        sourceLicense: "Cloud-Phone fallback presets",
        error: error instanceof Error ? error.message : "Failed to load MobileModels.",
        models: FALLBACK_MODELS,
      };
    }
  }

  const filtered = payload.models.filter((model) => {
    if (brand && !String(model.brand).toLowerCase().includes(brand)) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [
      model.brand,
      model.manufacturer,
      model.modelCode,
      model.marketingName,
      model.codename,
      model.device,
      model.label,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  return {
    ...payload,
    total: filtered.length,
    models: filtered.slice(0, limit),
  };
}
