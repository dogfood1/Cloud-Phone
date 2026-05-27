import { ref } from "vue";

import { downloadDeviceFile, uploadDeviceFile } from "../utils/device-files-api.js";
import { joinDevicePath } from "../utils/device-file-path.js";
import { getErrorMessage } from "../utils/api.js";

/**
 * @param {import("vue").Ref<string>} serialRef
 * @param {import("vue").Ref<string>} currentPathRef
 * @param {{ onDone?: () => void, setError?: (msg: string) => void }} hooks
 */
export function useDeviceFileTransfer(serialRef, currentPathRef, hooks = {}) {
  const transferBusy = ref(false);
  const uploadInputRef = ref(null);

  async function downloadEntry(entry) {
    if (!serialRef.value || entry.type !== "file" || transferBusy.value) {
      return;
    }

    transferBusy.value = true;
    hooks.setError?.("");

    try {
      const devicePath = joinDevicePath(currentPathRef.value, entry.name);
      await downloadDeviceFile(serialRef.value, devicePath, entry.name);
    } catch (error) {
      hooks.setError?.(getErrorMessage(error, "下载失败"));
    } finally {
      transferBusy.value = false;
    }
  }

  function triggerUpload() {
    if (transferBusy.value) {
      return;
    }

    uploadInputRef.value?.click();
  }

  async function onUploadSelected(event) {
    const input = event.target;
    const file = input?.files?.[0];
    input.value = "";

    if (!file || !serialRef.value || transferBusy.value) {
      return;
    }

    transferBusy.value = true;
    hooks.setError?.("");

    try {
      const devicePath = joinDevicePath(currentPathRef.value, file.name);
      await uploadDeviceFile(serialRef.value, devicePath, file);
      hooks.onDone?.();
    } catch (error) {
      hooks.setError?.(getErrorMessage(error, "上传失败"));
    } finally {
      transferBusy.value = false;
    }
  }

  return {
    transferBusy,
    uploadInputRef,
    downloadEntry,
    triggerUpload,
    onUploadSelected,
  };
}
