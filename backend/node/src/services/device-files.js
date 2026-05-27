import { runWithAdbLock } from "./adb-lock.js";
import {
  DEVICE_FILES_DEFAULT_OPEN,
  DEVICE_FS_ROOT,
  getParentDevicePath,
  resolveDevicePath,
} from "./device-file-path.js";
import { listDirectoryRaw } from "./device-files-list.js";

export async function listDeviceFiles(serial, requestedPath) {
  return runWithAdbLock(async () => {
    const devicePath = resolveDevicePath(requestedPath ?? DEVICE_FILES_DEFAULT_OPEN);
    const parentPath = getParentDevicePath(devicePath);
    const entries = await listDirectoryRaw(serial, devicePath);

    return {
      fsRoot: DEVICE_FS_ROOT,
      defaultOpenPath: DEVICE_FILES_DEFAULT_OPEN,
      path: devicePath,
      parentPath,
      atRoot: devicePath === DEVICE_FS_ROOT,
      entries,
    };
  });
}
