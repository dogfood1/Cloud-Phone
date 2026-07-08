"use strict";

const fs = require("node:fs");
const path = require("node:path");

const PACKAGE_ROOT = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "node_modules",
  "@lbr77",
  "zsign-wasm-resigner-wrapper",
);
const WASM_SOURCE = path.join(PACKAGE_ROOT, "dist", "zsign-wasm.min.js");
const WASM_CACHE = path.join(__dirname, ".cache", "zsign-wasm.min.cjs");

/** @type {Promise<import("@lbr77/zsign-wasm-resigner-wrapper").ZsignWasmResigner> | null} */
let resignerPromise = null;

function ensureWasmBundle() {
  if (!fs.existsSync(WASM_SOURCE)) {
    throw new Error("未安装 @lbr77/zsign-wasm-resigner-wrapper，请在 backend/node 执行 npm install。");
  }

  if (!fs.existsSync(WASM_CACHE)) {
    fs.mkdirSync(path.dirname(WASM_CACHE), { recursive: true });
    fs.copyFileSync(WASM_SOURCE, WASM_CACHE);
  }

  return require(WASM_CACHE);
}

async function getResigner() {
  if (!resignerPromise) {
    resignerPromise = (async () => {
      const wasmBundle = ensureWasmBundle();
      const createApi = require(path.join(PACKAGE_ROOT, "npm", "api.cjs"));
      const api = createApi(wasmBundle);
      return api.createResigner();
    })();
  }

  return resignerPromise;
}

async function signIpaFile({
  inputPath,
  outputPath,
  p12Path,
  p12Password,
  mobileprovisionPath,
  bundleId,
}) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`未找到待签名 IPA：${inputPath}`);
  }

  if (!fs.existsSync(p12Path)) {
    throw new Error(`未找到签名证书：${p12Path}`);
  }

  if (!fs.existsSync(mobileprovisionPath)) {
    throw new Error(`未找到描述文件：${mobileprovisionPath}`);
  }

  const inputIpa = fs.readFileSync(inputPath);
  const pkey = fs.readFileSync(p12Path);
  const prov = fs.readFileSync(mobileprovisionPath);
  const resigner = await getResigner();
  const result = await resigner.signIpa(inputIpa, {
    pkey,
    prov,
    password: p12Password,
    bundleId,
    adhoc: false,
    forceSign: true,
    zipLevel: 9,
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(result));
}

module.exports = {
  signIpaFile,
};
