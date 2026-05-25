import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildScrcpyCliArgs } from "./cli-args.js";

export async function writeScrcpyConfigFile(options = {}) {
  const lines = buildScrcpyConfigLines(options);
  const filePath = path.join(
    os.tmpdir(),
    `cloud-phone-scrcpy-${process.pid}-${Date.now()}.conf`,
  );

  await fs.writeFile(filePath, `${lines.join("\n")}\n`, "utf8");
  return filePath;
}

export function buildScrcpyConfigLines(options = {}) {
  const args = buildScrcpyCliArgs(options);
  const lines = [];

  for (const arg of args) {
    if (!arg.startsWith("--")) {
      continue;
    }

    const body = arg.slice(2);

    if (body.includes("=")) {
      lines.push(body);
      continue;
    }

    lines.push(body);
  }

  return lines;
}

export async function removeScrcpyConfigFile(filePath) {
  if (!filePath) {
    return;
  }

  await fs.unlink(filePath).catch(() => undefined);
}
