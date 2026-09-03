import { createHash } from "node:crypto";

import { runAdb } from "./adb-command.js";
import { shellQuote } from "./device-file-path.js";
import { ensureIconHelperInstalled } from "./icon-helper-ensure.js";
import {
  ICON_HELPER_CLIPBOARD_RECEIVER,
  ICON_HELPER_CLIPBOARD_SHELL,
  ICON_HELPER_PACKAGE,
} from "./icon-helper-paths.js";

export const MAX_DEVICE_CLIPBOARD_BYTES = 128 * 1024;

const CLIPBOARD_ACTION = "com.cloudphone.iconhelper.SET_CLIPBOARD";
const RESULT_PATTERN = /Broadcast completed: result=(-?\d+), data="([^"]*)"/;
const READ_RESULT_PATTERN = /^clipboard:(\d+):([a-f0-9]{64}):([A-Za-z0-9+/]*={0,2})$/m;

/**
 * @param {string} serial
 */
export async function readDeviceClipboard(serial) {
  const helper = await ensureIconHelperInstalled(serial, { createExternalFilesDir: false });
  const { stdout: packageOutput } = await runAdb(
    ["-s", serial, "shell", "pm", "path", ICON_HELPER_PACKAGE],
    { timeout: 15_000, maxBuffer: 1024 * 1024 },
  );
  const apkPath = String(packageOutput || "")
    .split(/\r?\n/)
    .find((line) => line.startsWith("package:"))
    ?.slice("package:".length)
    .trim();

  if (!apkPath) {
    throw clipboardError("clipboard_helper_path_missing", "无法定位设备剪切板 Helper。");
  }

  const appProcess = `CLASSPATH=${shellQuote(apkPath)} app_process / ${ICON_HELPER_CLIPBOARD_SHELL}`;
  const command = [
    'if [ "$(id -u)" = 0 ]; then',
    `su 2000 sh -c ${shellQuote(appProcess)};`,
    "else",
    `${appProcess};`,
    "fi",
  ].join(" ");
  const { stdout } = await runAdb(["-s", serial, "shell", command], {
    timeout: 30_000,
    maxBuffer: 2 * 1024 * 1024,
  });
  const result = parseDeviceClipboardOutput(stdout);

  return {
    ...result,
    helperAction: helper.action,
  };
}

/**
 * @param {string} serial
 * @param {string} text
 */
export async function writeDeviceClipboard(serial, text) {
  const payload = prepareDeviceClipboardPayload(text);
  const { bytes, sha256: expectedHash, clipboardExtra } = payload;

  const helper = await ensureIconHelperInstalled(serial, { createExternalFilesDir: false });
  const { stdout, stderr } = await runAdb(
    [
      "-s",
      serial,
      "shell",
      "am",
      "broadcast",
      "-a",
      CLIPBOARD_ACTION,
      "-n",
      ICON_HELPER_CLIPBOARD_RECEIVER,
      ...clipboardExtra,
    ],
    { timeout: 30_000, maxBuffer: 1024 * 1024 },
  );

  verifyClipboardBroadcast(`${stdout || ""}\n${stderr || ""}`, payload);

  return {
    bytes: bytes.length,
    sha256: expectedHash,
    cleared: bytes.length === 0,
    helperAction: helper.action,
  };
}

export function prepareDeviceClipboardPayload(text) {
  if (typeof text !== "string") {
    throw clipboardError("clipboard_text_required", "剪切板内容必须是文本。");
  }

  const bytes = Buffer.from(text, "utf8");
  if (bytes.length > MAX_DEVICE_CLIPBOARD_BYTES) {
    throw clipboardError(
      "clipboard_text_too_large",
      `剪切板内容不能超过 ${MAX_DEVICE_CLIPBOARD_BYTES / 1024} KiB。`,
    );
  }

  const expectedHash = createHash("sha256").update(bytes).digest("hex");
  const clipboardExtra = bytes.length
    ? ["--es", "text_base64", bytes.toString("base64")]
    : ["--ez", "clear", "true"];

  return { bytes, sha256: expectedHash, clipboardExtra };
}

export function verifyClipboardBroadcast(output, payload) {
  const result = output.match(RESULT_PATTERN);
  const expectedData = `clipboard:${payload.bytes.length}:${payload.sha256}`;

  if (!result || Number.parseInt(result[1], 10) !== -1 || result[2] !== expectedData) {
    const detail = result?.[2] || output.trim() || "broadcast_result_missing";
    throw clipboardError(
      "clipboard_write_failed",
      `设备未确认剪切板写入：${detail}`,
    );
  }
}

export function parseDeviceClipboardOutput(output) {
  const match = String(output || "").match(READ_RESULT_PATTERN);
  if (!match) {
    throw clipboardError("clipboard_read_failed", "设备未返回有效的剪切板内容。");
  }

  const expectedBytes = Number.parseInt(match[1], 10);
  const expectedHash = match[2];
  const encoded = match[3];
  if (encoded.length % 4 !== 0) {
    throw clipboardError("clipboard_read_failed", "设备剪切板内容编码无效。");
  }

  const bytes = Buffer.from(encoded, "base64");
  const actualHash = createHash("sha256").update(bytes).digest("hex");
  if (
    bytes.length !== expectedBytes ||
    bytes.length > MAX_DEVICE_CLIPBOARD_BYTES ||
    actualHash !== expectedHash ||
    bytes.toString("base64") !== encoded
  ) {
    throw clipboardError("clipboard_read_failed", "设备剪切板内容校验失败。");
  }

  const text = bytes.toString("utf8");
  if (!Buffer.from(text, "utf8").equals(bytes)) {
    throw clipboardError("clipboard_read_failed", "设备剪切板不是有效的 UTF-8 文本。");
  }

  return {
    text,
    bytes: bytes.length,
    sha256: actualHash,
    empty: bytes.length === 0,
  };
}

function clipboardError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
