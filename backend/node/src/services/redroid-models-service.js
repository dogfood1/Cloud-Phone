import fs from "node:fs/promises";
import https from "node:https";
import path from "node:path";

import { BACKEND_DATA_PATH } from "../config/paths.js";

const CACHE_PATH = path.join(BACKEND_DATA_PATH, "mobile-models-cache.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_VERSION = 2;
const MAX_MODELS = 20000;

const MODEL_SOURCES = [
  { key: "google", manufacturer: "Google", label: "Google", file: "brands/google.md" },
  { key: "samsung_global_en", manufacturer: "Samsung", label: "Samsung Global", region: "Global", file: "brands/samsung_global_en.md" },
  { key: "samsung_cn", manufacturer: "Samsung", label: "Samsung China", region: "China", file: "brands/samsung_cn.md" },
  { key: "xiaomi_en", manufacturer: "Xiaomi", label: "Xiaomi Global", region: "Global", file: "brands/xiaomi_en.md" },
  { key: "xiaomi_cn", manufacturer: "Xiaomi", label: "Xiaomi China", region: "China", file: "brands/xiaomi_cn.md" },
  { key: "xiaomi", manufacturer: "Xiaomi", label: "Xiaomi Mixed", file: "brands/xiaomi.md" },
  { key: "oneplus_en", manufacturer: "OnePlus", label: "OnePlus Global", region: "Global", file: "brands/oneplus_en.md" },
  { key: "oneplus", manufacturer: "OnePlus", label: "OnePlus China", region: "China", file: "brands/oneplus.md" },
  { key: "oppo_global_en", manufacturer: "OPPO", label: "OPPO Global", region: "Global", file: "brands/oppo_global_en.md" },
  { key: "oppo_cn", manufacturer: "OPPO", label: "OPPO China", region: "China", file: "brands/oppo_cn.md" },
  { key: "vivo_global_en", manufacturer: "vivo", label: "vivo Global", region: "Global", file: "brands/vivo_global_en.md" },
  { key: "vivo_cn", manufacturer: "vivo", label: "vivo China", region: "China", file: "brands/vivo_cn.md" },
  { key: "realme_global_en", manufacturer: "realme", label: "realme Global", region: "Global", file: "brands/realme_global_en.md" },
  { key: "realme_cn", manufacturer: "realme", label: "realme China", region: "China", file: "brands/realme_cn.md" },
  { key: "huawei_global_en", manufacturer: "HUAWEI", label: "HUAWEI Global", region: "Global", file: "brands/huawei_global_en.md" },
  { key: "huawei_cn", manufacturer: "HUAWEI", label: "HUAWEI China", region: "China", file: "brands/huawei_cn.md" },
  { key: "honor_global_en", manufacturer: "HONOR", label: "HONOR Global", region: "Global", file: "brands/honor_global_en.md" },
  { key: "honor_cn", manufacturer: "HONOR", label: "HONOR China", region: "China", file: "brands/honor_cn.md" },
  { key: "nothing", manufacturer: "Nothing", label: "Nothing", file: "brands/nothing.md" },
  { key: "asus_en", manufacturer: "ASUS", label: "ASUS Global", region: "Global", file: "brands/asus_en.md" },
  { key: "asus_cn", manufacturer: "ASUS", label: "ASUS China", region: "China", file: "brands/asus_cn.md" },
  { key: "blackshark_en", manufacturer: "Black Shark", label: "Black Shark Global", region: "Global", file: "brands/blackshark_en.md" },
  { key: "blackshark", manufacturer: "Black Shark", label: "Black Shark China", region: "China", file: "brands/blackshark.md" },
  { key: "coolpad", manufacturer: "Coolpad", label: "Coolpad", file: "brands/coolpad.md" },
  { key: "lenovo_cn", manufacturer: "Lenovo", label: "Lenovo China", region: "China", file: "brands/lenovo_cn.md" },
  { key: "letv", manufacturer: "Letv", label: "Letv", file: "brands/letv.md" },
  { key: "meizu_en", manufacturer: "MEIZU", label: "MEIZU Global", region: "Global", file: "brands/meizu_en.md" },
  { key: "meizu", manufacturer: "MEIZU", label: "MEIZU China", region: "China", file: "brands/meizu.md" },
  { key: "motorola_cn", manufacturer: "Motorola", label: "Motorola China", region: "China", file: "brands/motorola_cn.md" },
  { key: "nokia_cn", manufacturer: "Nokia", label: "Nokia China", region: "China", file: "brands/nokia_cn.md" },
  { key: "nubia", manufacturer: "nubia", label: "nubia", file: "brands/nubia.md" },
  { key: "smartisan", manufacturer: "Smartisan", label: "Smartisan", file: "brands/smartisan.md" },
  { key: "sony", manufacturer: "SONY", label: "SONY Global", region: "Global", file: "brands/sony.md" },
  { key: "sony_cn", manufacturer: "SONY", label: "SONY China", region: "China", file: "brands/sony_cn.md" },
  { key: "zhixuan", manufacturer: "HUAWEI", label: "HUAWEI Zhixuan", region: "China", file: "brands/zhixuan.md" },
  { key: "zte_cn", manufacturer: "ZTE", label: "ZTE China", region: "China", file: "brands/zte_cn.md" },
  { key: "360shouji", manufacturer: "360", label: "360 Phone", file: "brands/360shouji.md" },
];

const MOBILE_MODELS_RAW_BASE =
  "https://raw.githubusercontent.com/KHwang9883/MobileModels/master";

const FALLBACK_MODELS = [
  {
    id: "google:G-2PW4100:sailfish",
    source: "fallback",
    sourceKey: "google",
    sourceFile: "fallback",
    sourceLabel: "Google",
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
    sourceKey: "google",
    sourceFile: "fallback",
    sourceLabel: "Google",
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
    sourceKey: "samsung_global_en",
    sourceFile: "fallback",
    sourceLabel: "Samsung Global",
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
        sourceKey: source.key,
        sourceFile: source.file,
        sourceLabel: source.label || source.manufacturer,
        region: source.region || "",
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

    if (
      parsed.version === CACHE_VERSION &&
      Number.isFinite(age) &&
      age >= 0 &&
      age < CACHE_TTL_MS &&
      Array.isArray(parsed.models)
    ) {
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
    version: CACHE_VERSION,
    updatedAt: new Date().toISOString(),
    source: "https://github.com/KHwang9883/MobileModels",
    sourceLicense: "CC BY-NC-SA 4.0",
    models,
  };
  await writeCache(payload);
  return payload;
}

async function loadModelPayload(options = {}) {
  let payload = null;

  if (!options.refresh) {
    payload = await readCache();
  }

  if (payload) {
    return payload;
  }

  try {
    return await loadFromMobileModels();
  } catch (error) {
    return {
      version: CACHE_VERSION,
      updatedAt: new Date().toISOString(),
      source: "fallback",
      sourceLicense: "Cloud-Phone fallback presets",
      error: error instanceof Error ? error.message : "Failed to load MobileModels.",
      models: FALLBACK_MODELS,
    };
  }
}

export async function listRedroidModelBrands(options = {}) {
  const payload = await loadModelPayload(options);
  const countsBySource = new Map();

  for (const model of payload.models) {
    const sourceKey = String(model.sourceKey ?? "").trim();
    if (!sourceKey) {
      continue;
    }
    countsBySource.set(sourceKey, (countsBySource.get(sourceKey) ?? 0) + 1);
  }

  const brands = MODEL_SOURCES.map((source) => ({
    key: source.key,
    label: source.label || source.manufacturer,
    manufacturer: source.manufacturer,
    region: source.region || "",
    file: source.file,
    count: countsBySource.get(source.key) ?? 0,
  })).filter((source) => source.count > 0);

  if (!brands.length) {
    const fallbackBrands = new Map();

    for (const model of payload.models) {
      const key = String(model.sourceKey || model.brand || model.manufacturer || "").trim();
      if (!key || fallbackBrands.has(key)) {
        continue;
      }

      fallbackBrands.set(key, {
        key,
        label: model.sourceLabel || model.brand || model.manufacturer || key,
        manufacturer: model.manufacturer || model.brand || key,
        region: model.region || "",
        file: model.sourceFile || "",
        count: 1,
      });
    }

    brands.push(...fallbackBrands.values());
  }

  return {
    updatedAt: payload.updatedAt,
    source: payload.source,
    sourceLicense: payload.sourceLicense,
    error: payload.error,
    total: brands.length,
    modelTotal: payload.models.length,
    brands,
  };
}

export async function listRedroidModelPresets(options = {}) {
  const query = String(options.query ?? "").trim().toLowerCase();
  const brand = String(options.brand ?? "").trim().toLowerCase();
  const sourceKey = String(options.source ?? "").trim().toLowerCase();
  const limit = Math.min(Math.max(Number(options.limit) || 80, 1), 1000);
  const payload = await loadModelPayload(options);

  const filtered = payload.models.filter((model) => {
    if (sourceKey && String(model.sourceKey ?? "").toLowerCase() !== sourceKey) {
      return false;
    }

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
