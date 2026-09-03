import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_DEVICE_CLIPBOARD_BYTES,
  parseDeviceClipboardOutput,
  prepareDeviceClipboardPayload,
  verifyClipboardBroadcast,
} from "../src/services/device-clipboard.js";

test("encodes Unicode clipboard text as UTF-8 Base64", () => {
  const payload = prepareDeviceClipboardPayload("中文\nclipboard");

  assert.equal(payload.bytes.toString("utf8"), "中文\nclipboard");
  assert.deepEqual(payload.clipboardExtra.slice(0, 2), ["--es", "text_base64"]);
  assert.equal(Buffer.from(payload.clipboardExtra[2], "base64").toString("utf8"), "中文\nclipboard");
});

test("decodes and verifies device clipboard output", () => {
  const text = "设备剪切板读取\nline-2";
  const payload = prepareDeviceClipboardPayload(text);
  const encoded = payload.bytes.toString("base64");
  const result = parseDeviceClipboardOutput(
    `clipboard:${payload.bytes.length}:${payload.sha256}:${encoded}\r\n`,
  );

  assert.equal(result.text, text);
  assert.equal(result.bytes, payload.bytes.length);
  assert.equal(result.sha256, payload.sha256);
  assert.equal(result.empty, false);
});

test("distinguishes an empty clipboard", () => {
  const payload = prepareDeviceClipboardPayload("");
  const result = parseDeviceClipboardOutput(`clipboard:0:${payload.sha256}:`);

  assert.deepEqual(result, {
    text: "",
    bytes: 0,
    sha256: payload.sha256,
    empty: true,
  });
});

test("rejects tampered device clipboard output", () => {
  const payload = prepareDeviceClipboardPayload("trusted");
  assert.throws(
    () => parseDeviceClipboardOutput(`clipboard:7:${payload.sha256}:dGFtcGVyZWQ=`),
    (error) => error?.code === "clipboard_read_failed",
  );
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
