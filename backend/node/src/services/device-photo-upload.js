import path from "node:path";

import { runAdb } from "./adb-command.js";
import { runWithAdbLock } from "./adb-lock.js";
import { shellQuote } from "./device-file-path.js";

export const MAX_DEVICE_PHOTO_BYTES = 50 * 1024 * 1024;

export const DEVICE_PHOTO_ALBUMS = Object.freeze({
  pictures: "/storage/emulated/0/Pictures",
  camera: "/storage/emulated/0/DCIM/Camera",
});

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".heic",
  ".heif",
]);

function createPhotoError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function normalizePhotoFilename(filename) {
  const base = path.posix.basename(String(filename ?? "").replace(/\\/g, "/")).trim();
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ");

  if (!cleaned || cleaned === "." || cleaned === "..") {
    throw createPhotoError("photo_filename_invalid", "图片文件名无效。");
  }

  const extension = path.posix.extname(cleaned).toLowerCase();
  if (!SUPPORTED_IMAGE_EXTENSIONS.has(extension)) {
    throw createPhotoError("photo_type_unsupported", "仅支持 JPG、PNG、WebP、GIF、HEIC 或 HEIF 图片。");
  }

  const stem = cleaned.slice(0, -extension.length).slice(0, 180 - extension.length).trim();
  if (!stem) {
    throw createPhotoError("photo_filename_invalid", "图片文件名无效。");
  }

  return `${stem}${extension}`;
}

export function resolvePhotoDestination(album, filename) {
  const directory = DEVICE_PHOTO_ALBUMS[String(album ?? "").toLowerCase()];
  if (!directory) {
    throw createPhotoError("photo_album_invalid", "目标相册无效。");
  }

  const normalizedFilename = normalizePhotoFilename(filename);
  return {
    album: String(album).toLowerCase(),
    directory,
    filename: normalizedFilename,
    devicePath: path.posix.join(directory, normalizedFilename),
  };
}

export function devicePathToFileUri(devicePath) {
  return `file://${String(devicePath)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

export function buildMediaScanCommand(devicePath) {
  const uri = devicePathToFileUri(devicePath);
  return `am broadcast --user 0 -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d ${shellQuote(uri)}`;
}

/**
 * Upload one image into shared storage and request an immediate MediaStore scan.
 */
export async function uploadDevicePhoto(serial, { album, filename, localPath, size }) {
  if (!Number.isFinite(size) || size <= 0) {
    throw createPhotoError("upload_empty_body", "上传内容为空。");
  }
  if (size > MAX_DEVICE_PHOTO_BYTES) {
    throw createPhotoError("photo_too_large", "单张图片不能超过 50 MB。");
  }

  const destination = resolvePhotoDestination(album, filename);

  return runWithAdbLock(async () => {
    await runAdb(
      ["-s", serial, "shell", `mkdir -p ${shellQuote(destination.directory)}`],
      { timeout: 20_000 },
    );
    await runAdb(["-s", serial, "push", localPath, destination.devicePath], {
      timeout: 600_000,
    });
    const { stdout } = await runAdb(
      ["-s", serial, "shell", buildMediaScanCommand(destination.devicePath)],
      { timeout: 30_000 },
    );

    return {
      ...destination,
      bytes: size,
      mediaScan: {
        requested: true,
        completed: /Broadcast completed:\s*result=0/i.test(stdout),
      },
    };
  }, { lockKey: serial });
}
