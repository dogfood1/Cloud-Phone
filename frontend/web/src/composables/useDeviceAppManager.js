import { computed, ref, toRef, watch } from "vue";

import { createDeviceAppListState } from "./device-app-manager-list.js";
import {
  downloadDeviceAppApk,
  fetchDeviceAppDetail,
  installDeviceApk,
  setDeviceAppFrozen,
  uninstallDeviceApp,
} from "../utils/device-apps-api.js";
import { getErrorMessage } from "../utils/api.js";

/**
 * @param {{ device: { serial?: string }, open: boolean }} props
 * @param {(e: "close" | "open-files", ...args: unknown[]) => void} emit
 */
export function useDeviceAppManager(props, emit) {
  const deviceRef = toRef(props, "device");
  const openRef = toRef(props, "open");
  const list = createDeviceAppListState(() => String(deviceRef.value?.serial || "").trim());

  const selected = ref(null);
  const detailOpen = ref(false);
  const detail = ref(null);
  const detailError = ref("");
  const detailLoading = ref(false);
  const actionHint = ref("");
  const actionBusy = ref(false);
  const installBusy = ref(false);
  const installInputRef = ref(null);
  const uninstallTarget = ref(null);

  const selectedPackage = computed(() => selected.value?.packageName ?? null);

  async function loadDetail(packageName) {
    detail.value = null;
    detailError.value = "";
    const serial = deviceRef.value?.serial;
    if (!packageName || !serial) {
      return;
    }
    detailLoading.value = true;
    try {
      detail.value = await fetchDeviceAppDetail(serial, packageName);
      syncSelectedEnabled(detail.value);
    } catch (error) {
      detailError.value = getErrorMessage(error, "读取详情失败");
    } finally {
      detailLoading.value = false;
    }
  }

  function syncSelectedEnabled(d) {
    if (!d?.packageName || !selected.value || selected.value.packageName !== d.packageName) {
      return;
    }
    const row = list.apps.value.find((a) => a.packageName === d.packageName);
    if (row) {
      row.enabled = Boolean(d.enabled);
      selected.value = { ...selected.value, enabled: row.enabled };
    }
  }

  function selectApp(row) {
    selected.value = row;
    void loadDetail(row.packageName);
  }

  function openDetail(row) {
    selectApp(row);
    detailOpen.value = true;
  }

  function closeDetail() {
    detailOpen.value = false;
  }

  function handleClose() {
    emit("close");
  }

  function handleBackdropClick() {
    emit("close");
  }

  async function handleFreezeToggle() {
    const pkg = selectedPackage.value;
    const serial = deviceRef.value?.serial;
    if (!pkg || !serial || actionBusy.value || !detail.value) {
      return;
    }
    const frozen = Boolean(detail.value.enabled);
    actionBusy.value = true;
    actionHint.value = "";
    try {
      await setDeviceAppFrozen(serial, pkg, frozen);
      detail.value = { ...detail.value, enabled: !frozen };
      syncSelectedEnabled(detail.value);
      actionHint.value = frozen ? "已冻结" : "已解冻";
      await list.loadList({ preferCache: false });
    } catch (error) {
      actionHint.value = getErrorMessage(error, "操作失败");
    } finally {
      actionBusy.value = false;
    }
  }

  function requestUninstall(row) {
    uninstallTarget.value = row || selected.value;
  }

  async function confirmUninstall() {
    const target = uninstallTarget.value;
    const serial = deviceRef.value?.serial;
    uninstallTarget.value = null;
    if (!target?.packageName || !serial || actionBusy.value) {
      return;
    }
    actionBusy.value = true;
    actionHint.value = "";
    try {
      await uninstallDeviceApp(serial, target.packageName);
      actionHint.value = "已卸载";
      selected.value = null;
      detail.value = null;
      detailOpen.value = false;
      await list.loadList({ preferCache: false });
    } catch (error) {
      actionHint.value = getErrorMessage(error, "卸载失败");
    } finally {
      actionBusy.value = false;
    }
  }

  async function handleExtractApk() {
    const pkg = selectedPackage.value;
    const serial = deviceRef.value?.serial;
    if (!pkg || !serial || actionBusy.value) {
      return;
    }
    actionBusy.value = true;
    actionHint.value = "";
    try {
      await downloadDeviceAppApk(serial, pkg);
      actionHint.value = "APK 已开始下载";
    } catch (error) {
      actionHint.value = getErrorMessage(error, "导出失败");
    } finally {
      actionBusy.value = false;
    }
  }

  function handleOpenDataDir() {
    const dir = detail.value?.dataDir?.trim();
    if (!dir) {
      actionHint.value = "无 data 目录信息";
      return;
    }
    emit("open-files", dir);
  }

  function triggerInstallPick() {
    installInputRef.value?.click?.();
  }

  async function onInstallFile(event) {
    const input = event?.target;
    const file = input?.files?.[0];
    const serial = deviceRef.value?.serial;
    if (!file || !serial || installBusy.value) {
      return;
    }
    installBusy.value = true;
    actionHint.value = "";
    try {
      await installDeviceApk(serial, file);
      actionHint.value = "安装成功";
      await list.loadList({ preferCache: false });
    } catch (error) {
      actionHint.value = getErrorMessage(error, "安装失败");
    } finally {
      installBusy.value = false;
      if (input) {
        input.value = "";
      }
    }
  }

  watch(openRef, (isOpen) => {
    if (isOpen) {
      list.query.value = "";
      selected.value = null;
      detailOpen.value = false;
      detail.value = null;
      detailError.value = "";
      actionHint.value = "";
      uninstallTarget.value = null;
    }
  });

  return {
    listLoading: list.listLoading,
    apps: list.apps,
    listError: list.listError,
    query: list.query,
    selected,
    detailOpen,
    detail,
    detailError,
    detailLoading,
    actionHint,
    actionBusy,
    installBusy,
    installInputRef,
    uninstallTarget,
    filteredApps: list.filteredApps,
    selectedPackage,
    loadList: list.loadList,
    selectApp,
    openDetail,
    closeDetail,
    handleClose,
    handleBackdropClick,
    handleFreezeToggle,
    requestUninstall,
    confirmUninstall,
    handleExtractApk,
    handleOpenDataDir,
    triggerInstallPick,
    onInstallFile,
  };
}
