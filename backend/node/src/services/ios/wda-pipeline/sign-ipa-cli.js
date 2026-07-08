import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { signIpaFile } = require("./zsign-wasm-bridge.cjs");

function readArg(flag) {
  const index = process.argv.indexOf(flag);

  if (index < 0) {
    return "";
  }

  return process.argv[index + 1] ?? "";
}

async function main() {
  const inputPath = readArg("--input");
  const outputPath = readArg("--output");
  const p12Path = readArg("--p12");
  const password = readArg("--password");
  const mobileprovisionPath = readArg("--mobileprovision");
  const bundleId = readArg("--bundle-id");

  if (!inputPath || !outputPath || !p12Path || !mobileprovisionPath || !bundleId) {
    console.error(
      "用法: node sign-ipa-cli.js --input in.ipa --output out.ipa --p12 dev.p12 --password pass --mobileprovision dev.mobileprovision --bundle-id com.example.app",
    );
    process.exit(2);
  }

  try {
    await signIpaFile({
      inputPath: path.resolve(inputPath),
      outputPath: path.resolve(outputPath),
      p12Path: path.resolve(p12Path),
      p12Password: password,
      mobileprovisionPath: path.resolve(mobileprovisionPath),
      bundleId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  void main();
}

export { signIpaFile };
