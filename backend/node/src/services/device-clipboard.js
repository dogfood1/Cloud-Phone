import { createHash } from "node:crypto";

import { runAdb } from "./adb-command.js";
import { ensureIconHelperInstalled } from "./icon-helper-ensure.js";
import { ICON_HELPER_CLIPBOARD_RECEIVER } from "./icon-helper-paths.js";

export const MAX_DEVICE_CLIPBOARD_BYTES = 128 * 1024;

const CLIPBOARD_ACTION = "com.cloudphone.iconhelper.SET_CLIPBOARD";
const RESULT_PATTERN = /Broadcast completed: result=(-?\d+), data="([^"]*)"/;

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

function clipboardError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
