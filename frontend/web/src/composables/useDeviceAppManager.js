import { computed, ref, toRef, watch } from "vue";

import {
  deviceAppIconUrl,
  downloadDeviceAppApk,
  fetchDeviceAppDetail,
  fetchDeviceApps,
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

  const listLoading = ref(false);
  const apps = ref([]);
  const listError = ref("");
  const query = ref("");
  const selected = ref(null);
  const detail = ref(null);
  const detailError = ref("");
  const detailLoading = ref(false);
  const actionHint = ref("");
  const actionBusy = ref(false);
  const installBusy = ref(false);
  const installInputRef = ref(null);
  const uninstallTarget = ref(null);

  const filteredApps = computed(() => {
    const q = query.value.trim().toLowerCase();

    if (!q) {
      return apps.value;
    }

    return apps.value.filter((row) => row.packageName.toLowerCase().includes(q));
  });

  const selectedPackage = computed(() => selected.value?.packageName ?? null);

  function iconUrlFor(pkg) {
    const serial = deviceRef.value?.serial;
    return serial ? deviceAppIconUrl(serial, pkg) : "";
  }

  function onAppIconError(event) {
    const el = event.target;

    if (el instanceof HTMLImageElement) {
      el.style.visibility = "hidden";
    }
  }

  async function loadList() {
    const serial = deviceRef.value?.serial;

    if (!serial) {
      listError.value = "设备序列号无效";
      return;
    }

    listLoading.value = true;
    listError.value = "";

    try {
      apps.value = await fetchDeviceApps(serial);
    } catch (error) {
      listError.value = getErrorMessage(error, "读取应用列表失败");
      apps.value = [];
    } finally {
      listLoading.value = false;
    }
  }

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

  /** @param {{ packageName?: string, enabled?: boolean } | null} d */
  function syncSelectedEnabled(d) {
    if (!d?.packageName || !selected.value || selected.value.packageName !== d.packageName) {
      return;
    }

    const row = apps.value.find((a) => a.packageName === d.packageName);

    if (row) {
      row.enabled = Boolean(d.enabled);
      selected.value = { ...selected.value, enabled: row.enabled };
    }
  }

  function selectApp(row) {
    selected.value = row;
    void loadDetail(row.packageName);
  }

  function handleClose() {
    emit("close");
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget && !uninstallTarget.value) {
      handleClose();
    }
  }

  async function handleFreezeToggle() {
    const pkg = selectedPackage.value;
    const serial = deviceRef.value?.serial;

    if (!pkg || !serial || actionBusy.value) {
      return;
    }

    const freeze = Boolean(selected.value?.enabled);
    actionBusy.value = true;
    actionHint.value = "";

    try {
      await setDeviceAppFrozen(serial, pkg, freeze);
      actionHint.value = freeze ? "已冻结" : "已解冻";
      await loadList();
      selected.value = apps.value.find((a) => a.packageName === pkg) ?? selected.value;
      await loadDetail(pkg);
    } catch (error) {
      actionHint.value = getErrorMessage(error, "操作失败");
    } finally {
      actionBusy.value = false;
    }
  }

  function requestUninstall() {
    const pkg = selectedPackage.value;

    if (!pkg) {
      return;
    }

    uninstallTarget.value = {
      packageName: pkg,
      label: detail.value?.label ?? pkg,
    };
  }

  async function confirmUninstall() {
    const tgt = uninstallTarget.value;
    const serial = deviceRef.value?.serial;

    if (!tgt || !serial || actionBusy.value) {
      return;
    }

    actionBusy.value = true;
    actionHint.value = "";

    try {
      await uninstallDeviceApp(serial, tgt.packageName);
      actionHint.value = "已卸载";
      uninstallTarget.value = null;
      selected.value = null;
      detail.value = null;
      await loadList();
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
    const input = event.target;
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
      await loadList();
    } catch (error) {
      actionHint.value = getErrorMessage(error, "安装失败");
    } finally {
      installBusy.value = false;
      input.value = "";
    }
  }

  watch(openRef, (isOpen) => {
    if (isOpen) {
      query.value = "";
      selected.value = null;
      detail.value = null;
      detailError.value = "";
      actionHint.value = "";
      uninstallTarget.value = null;
      void loadList();
    }
  });

  return {
    listLoading,
    apps,
    listError,
    query,
    selected,
    detail,
    detailError,
    detailLoading,
    actionHint,
    actionBusy,
    installBusy,
    installInputRef,
    uninstallTarget,
    filteredApps,
    selectedPackage,
    iconUrlFor,
    onAppIconError,
    loadList,
    selectApp,
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
