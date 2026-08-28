import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_DEVICE_CLIPBOARD_BYTES,
  prepareDeviceClipboardPayload,
  verifyClipboardBroadcast,
} from "../src/services/device-clipboard.js";

test("encodes Unicode clipboard text as UTF-8 Base64", () => {
  const payload = prepareDeviceClipboardPayload("中文\nclipboard");

  assert.equal(payload.bytes.toString("utf8"), "中文\nclipboard");
  assert.deepEqual(payload.clipboardExtra.slice(0, 2), ["--es", "text_base64"]);
  assert.equal(Buffer.from(payload.clipboardExtra[2], "base64").toString("utf8"), "中文\nclipboard");
});

test("uses a boolean extra when clearing the clipboard", () => {
  const payload = prepareDeviceClipboardPayload("");

  assert.equal(payload.bytes.length, 0);
  assert.deepEqual(payload.clipboardExtra, ["--ez", "clear", "true"]);
});

test("accepts the byte limit and rejects larger payloads", () => {
  assert.equal(
    prepareDeviceClipboardPayload("a".repeat(MAX_DEVICE_CLIPBOARD_BYTES)).bytes.length,
    MAX_DEVICE_CLIPBOARD_BYTES,
  );
  assert.throws(
    () => prepareDeviceClipboardPayload("a".repeat(MAX_DEVICE_CLIPBOARD_BYTES + 1)),
    (error) => error?.code === "clipboard_text_too_large",
  );
});

test("requires an exact successful broadcast receipt", () => {
  const payload = prepareDeviceClipboardPayload("receipt");
  const output = `Broadcast completed: result=-1, data="clipboard:${payload.bytes.length}:${payload.sha256}"`;

  assert.doesNotThrow(() => verifyClipboardBroadcast(output, payload));
  assert.throws(
    () => verifyClipboardBroadcast('Broadcast completed: result=0, data="error:clipboard_write_failed"', payload),
    (error) => error?.code === "clipboard_write_failed",
  );
});
