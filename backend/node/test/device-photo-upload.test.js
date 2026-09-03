import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMediaScanCommand,
  devicePathToFileUri,
  normalizePhotoFilename,
  resolvePhotoDestination,
} from "../src/services/device-photo-upload.js";

test("resolvePhotoDestination limits uploads to shared photo albums", () => {
  assert.deepEqual(resolvePhotoDestination("pictures", "sample.jpg"), {
    album: "pictures",
    directory: "/storage/emulated/0/Pictures",
    filename: "sample.jpg",
    devicePath: "/storage/emulated/0/Pictures/sample.jpg",
  });
  assert.equal(
    resolvePhotoDestination("camera", "capture.png").devicePath,
    "/storage/emulated/0/DCIM/Camera/capture.png",
  );
  assert.throws(() => resolvePhotoDestination("downloads", "sample.jpg"), /目标相册无效/);
});

test("normalizePhotoFilename removes path components and rejects non-images", () => {
  assert.equal(normalizePhotoFilename("../../相片  01.JPG"), "相片 01.jpg");
  assert.throws(() => normalizePhotoFilename("payload.apk"), /仅支持/);
});

test("media scan command emits an encoded file URI", () => {
  const devicePath = "/storage/emulated/0/Pictures/测试 photo.jpg";
  assert.equal(
    devicePathToFileUri(devicePath),
    "file:///storage/emulated/0/Pictures/%E6%B5%8B%E8%AF%95%20photo.jpg",
  );
  assert.match(buildMediaScanCommand(devicePath), /MEDIA_SCANNER_SCAN_FILE/);
  assert.match(buildMediaScanCommand(devicePath), /%E6%B5%8B%E8%AF%95%20photo\.jpg/);
});
