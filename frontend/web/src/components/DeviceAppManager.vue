<script setup>
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import AppIcon from "./AppIcon.vue";
import DeviceAppManagerDialogs from "./DeviceAppManagerDialogs.vue";
import IconHelperGatePanel from "./IconHelperGatePanel.vue";
import PanelAlert from "./ui/PanelAlert.vue";
import { useAppFeedback } from "../composables/useAppFeedback.js";
import { useDeviceAppManager } from "../composables/useDeviceAppManager.js";
import { useIconHelperGate } from "../composables/useIconHelperGate.js";

const props = defineProps({
  device: {
    type: Object,
    required: true,
  },
  open: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close", "open-files"]);
const { t } = useI18n();

const {
  listLoading,
  listError,
  query,
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
  filteredApps,
  selectedPackage,
  loadList,
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
} = useDeviceAppManager(props, emit);

const {
  consentDialogOpen,
  phase,
  progress,
  progressPercent,
  showProgressUi,
  packageNamesOnly,
  answerConsent,
  prepareIconHelper,
} = useIconHelperGate();

const gateBusy = ref(false);
const feedback = useAppFeedback();

const progressLabel = computed(() => {
  if (phase.value === "ensuring") {
    return t("iconHelper.installing");
  }
  if (progress.value.phase === "running") {
    return t("iconHelper.extractingProgress", {
      done: progress.value.done,
      total: progress.value.total || "?",
    });
  }
  return t("iconHelper.extracting");
});

const showDeniedHint = computed(
  () => props.open && packageNamesOnly.value && !gateBusy.value && !listLoading.value,
);

watch(actionHint, (message) => {
  if (message) {
    feedback.info(message);
  }
});

watch(listError, (message) => {
  if (message) {
    feedback.error(message);
  }
});

watch(
  () => [props.open, props.device?.serial],
  async ([isOpen]) => {
    if (!isOpen || !props.device?.serial) {
      return;
    }

    gateBusy.value = true;
    try {
      const result = await prepareIconHelper(props.device.serial);
      await loadList({ packageNamesOnly: result.packageNamesOnly });
    } finally {
      gateBusy.value = false;
    }
  },
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="device-files-overlay device-apps-overlay"
      role="presentation"
      @click="handleBackdropClick"
    >
      <section
        class="device-apps"
        role="dialog"
        aria-modal="true"
        aria-label="应用管理"
        @click.stop
      >
        <header class="device-apps__header">
          <div class="device-apps__title">
            <AppIcon name="apps" />
            <div>
              <h3>应用管理</h3>
              <p>{{ device.displayName }} · {{ device.serial }}</p>
            </div>
          </div>
          <div class="device-apps__actions">
            <input
              ref="installInputRef"
              type="file"
              accept=".apk,application/vnd.android.package-archive"
              class="visually-hidden"
              @change="onInstallFile"
            />
            <button
              type="button"
              class="device-apps__btn device-apps__btn--primary"
              :disabled="installBusy || !device.connected"
              title="选择本地 APK 安装到设备（需已连接 ADB）"
              @click="triggerInstallPick"
            >
              {{ installBusy ? "安装中…" : "安装应用" }}
            </button>
            <button
              type="button"
              class="device-apps__nav-btn"
              title="刷新列表"
              :disabled="listLoading || gateBusy"
              @click="loadList({ packageNamesOnly })"
            >
              <AppIcon name="refresh" />
            </button>
            <button type="button" class="device-files__close" title="关闭" @click="handleClose">
              ×
            </button>
          </div>
        </header>

        <IconHelperGatePanel
          :consent-open="consentDialogOpen"
          :busy="showProgressUi"
          :progress-percent="progressPercent"
          :progress-label="progressLabel"
          :current-package="progress.current"
          :denied-hint="showDeniedHint"
          @allow="answerConsent(true)"
          @deny="answerConsent(false)"
        />

        <div class="device-apps__search">
          <label class="visually-hidden" for="device-apps-q">搜索包名</label>
          <input
            id="device-apps-q"
            v-model="query"
            type="search"
            class="device-apps__search-input"
            placeholder="筛选应用名或包名…"
            autocomplete="off"
          />
        </div>

        <PanelAlert v-if="listError" type="error" :message="listError" />

        <div v-if="listLoading" class="device-apps__progress" role="status">
          <div class="device-apps__progress-row">
            <span class="device-apps__progress-label">
              正在获取应用列表…
            </span>
          </div>
          <div class="device-apps__progress-bar" aria-hidden="true">
            <div
              class="device-apps__progress-bar-fill"
              :class="{ 'device-apps__progress-bar-fill--indeterminate': listLoading }"
            />
          </div>
        </div>

        <div class="device-apps__body">
          <div class="device-apps__list-wrap">
            <p v-if="listLoading" class="device-files__status">正在加载应用…</p>
            <p v-else-if="!filteredApps.length" class="device-files__status">无匹配应用</p>
            <ul v-else class="device-apps__list" role="list">
              <li v-for="row in filteredApps" :key="row.packageName">
                <button
                  type="button"
                  class="device-apps__row"
                  :class="{ 'device-apps__row--active': selectedPackage === row.packageName }"
                  @click="openDetail(row)"
                >
                  <span class="device-apps__row-text">
                    <span class="device-apps__name">{{
                      packageNamesOnly ? row.packageName : row.label || "—"
                    }}</span>
                    <span v-if="!packageNamesOnly" class="device-apps__pkg">{{
                      row.packageName
                    }}</span>
                    <span class="device-apps__badges">
                      <span v-if="row.system" class="device-apps__badge">系统</span>
                      <span v-if="!row.enabled" class="device-apps__badge device-apps__badge--warn"
                        >已冻结</span
                      >
                    </span>
                  </span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        <DeviceAppManagerDialogs
          :detail-open="detailOpen"
          :detail="detail"
          :detail-loading="detailLoading"
          :detail-error="detailError"
          :selected-package="selectedPackage"
          :selected="selected"
          :action-busy="actionBusy"
          :package-names-only="packageNamesOnly"
          :uninstall-target="uninstallTarget"
          @close-detail="closeDetail"
          @request-uninstall="requestUninstall"
          @freeze-toggle="handleFreezeToggle"
          @extract-apk="handleExtractApk"
          @open-data-dir="handleOpenDataDir"
          @cancel-uninstall="uninstallTarget = null"
          @confirm-uninstall="confirmUninstall"
        />
      </section>
    </div>
  </Teleport>
</template>
