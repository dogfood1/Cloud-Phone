<script setup>
import AppIcon from "./AppIcon.vue";
import { useDeviceAppManager } from "../composables/useDeviceAppManager.js";

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

const {
  listLoading,
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
} = useDeviceAppManager(props, emit);
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
              :disabled="listLoading"
              @click="loadList"
            >
              <AppIcon name="refresh" />
            </button>
            <button type="button" class="device-files__close" title="关闭" @click="handleClose">
              ×
            </button>
          </div>
        </header>

        <div class="device-apps__search">
          <label class="visually-hidden" for="device-apps-q">搜索包名</label>
          <input
            id="device-apps-q"
            v-model="query"
            type="search"
            class="device-apps__search-input"
            placeholder="筛选包名…"
            autocomplete="off"
          />
        </div>

        <p v-if="actionHint" class="device-apps__hint">{{ actionHint }}</p>

        <div class="device-apps__body">
          <div class="device-apps__list-wrap">
            <p v-if="listLoading" class="device-files__status">正在加载应用…</p>
            <p v-else-if="listError" class="device-files__status device-files__status--error">
              {{ listError }}
            </p>
            <p v-else-if="!filteredApps.length" class="device-files__status">无匹配应用</p>
            <ul v-else class="device-apps__list" role="list">
              <li v-for="row in filteredApps" :key="row.packageName">
                <button
                  type="button"
                  class="device-apps__row"
                  :class="{ 'device-apps__row--active': selectedPackage === row.packageName }"
                  @click="selectApp(row)"
                >
                  <span class="device-apps__icon-wrap">
                    <img
                      class="device-apps__icon"
                      :src="iconUrlFor(row.packageName)"
                      :alt="''"
                      loading="lazy"
                      @error="onAppIconError"
                    />
                  </span>
                  <span class="device-apps__row-text">
                    <span class="device-apps__pkg">{{ row.packageName }}</span>
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

          <aside class="device-apps__detail" aria-live="polite">
            <template v-if="!selected">
              <p class="device-apps__placeholder">选择左侧应用查看详情</p>
            </template>
            <template v-else>
              <p v-if="detailLoading" class="device-files__status">正在读取详情…</p>
              <p
                v-else-if="detailError"
                class="device-files__status device-files__status--error"
              >
                {{ detailError }}
              </p>
              <div v-else-if="detail" class="device-apps__detail-inner">
                <h4 class="device-apps__detail-title">{{ detail.label }}</h4>
                <dl class="device-apps__dl">
                  <div>
                    <dt>包名</dt>
                    <dd>{{ detail.packageName }}</dd>
                  </div>
                  <div v-if="detail.versionName || detail.versionCode">
                    <dt>版本</dt>
                    <dd>
                      {{ detail.versionName || "—" }}
                      <span v-if="detail.versionCode" class="device-apps__muted"
                        >({{ detail.versionCode }})</span
                      >
                    </dd>
                  </div>
                  <div v-if="detail.targetSdkVersion || detail.minSdkVersion">
                    <dt>SDK</dt>
                    <dd>
                      target {{ detail.targetSdkVersion || "—" }} / min
                      {{ detail.minSdkVersion || "—" }}
                    </dd>
                  </div>
                  <div>
                    <dt>状态</dt>
                    <dd>{{ detail.enabled ? "已启用" : "已冻结（用户）" }}</dd>
                  </div>
                  <div v-if="detail.dataDir">
                    <dt>数据目录</dt>
                    <dd class="device-apps__mono">{{ detail.dataDir }}</dd>
                  </div>
                  <div v-if="detail.codePath">
                    <dt>安装路径</dt>
                    <dd class="device-apps__mono">{{ detail.codePath }}</dd>
                  </div>
                </dl>

                <div class="device-apps__detail-btns">
                  <button
                    type="button"
                    class="device-apps__btn"
                    :disabled="actionBusy || detail.system"
                    :title="
                      detail.system ? '不建议卸载系统应用' : ''
                    "
                    @click="requestUninstall"
                  >
                    卸载…
                  </button>
                  <button
                    type="button"
                    class="device-apps__btn"
                    :disabled="actionBusy"
                    @click="handleFreezeToggle"
                  >
                    {{ detail.enabled ? "冻结" : "解冻" }}
                  </button>
                  <button
                    type="button"
                    class="device-apps__btn"
                    :disabled="actionBusy"
                    @click="handleExtractApk"
                  >
                    提取 APK
                  </button>
                  <button
                    type="button"
                    class="device-apps__btn"
                    :disabled="!detail.dataDir"
                    @click="handleOpenDataDir"
                  >
                    打开 data 目录
                  </button>
                </div>
              </div>
            </template>
          </aside>
        </div>

        <div
          v-if="uninstallTarget"
          class="device-apps__confirm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="apps-uninstall-title"
        >
          <div class="device-apps__confirm-card" @click.stop>
            <h4 id="apps-uninstall-title">确认卸载</h4>
            <p>
              将卸载「{{ uninstallTarget.label }}」（{{ uninstallTarget.packageName }}），此操作不可撤销。
            </p>
            <div class="device-apps__confirm-actions">
              <button
                type="button"
                class="device-apps__btn"
                :disabled="actionBusy"
                @click="uninstallTarget = null"
              >
                取消
              </button>
              <button
                type="button"
                class="device-apps__btn device-apps__btn--danger"
                :disabled="actionBusy"
                @click="confirmUninstall"
              >
                确认卸载
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>
