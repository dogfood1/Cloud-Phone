<script setup>
defineProps({
  detailOpen: { type: Boolean, default: false },
  detail: { type: Object, default: null },
  detailLoading: { type: Boolean, default: false },
  detailError: { type: String, default: "" },
  selectedPackage: { type: String, default: null },
  selected: { type: Object, default: null },
  actionBusy: { type: Boolean, default: false },
  packageNamesOnly: { type: Boolean, default: false },
  uninstallTarget: { type: Object, default: null },
});

const emit = defineEmits([
  "close-detail",
  "request-uninstall",
  "freeze-toggle",
  "extract-apk",
  "open-data-dir",
  "cancel-uninstall",
  "confirm-uninstall",
]);
</script>

<template>
  <div
    v-if="detailOpen"
    class="device-apps__detail-modal"
    role="dialog"
    aria-modal="true"
    aria-label="应用详情"
    @click="emit('close-detail')"
  >
    <div class="device-apps__detail-card" @click.stop>
      <header class="device-apps__detail-header">
        <div class="device-apps__detail-headings">
          <h4 class="device-apps__detail-title">
            {{ packageNamesOnly ? selectedPackage : detail?.label ?? selectedPackage }}
          </h4>
          <p class="device-apps__detail-sub">{{ selectedPackage }}</p>
        </div>
        <button type="button" class="device-files__close" title="关闭" @click="emit('close-detail')">
          ×
        </button>
      </header>

      <div class="device-apps__detail-body" aria-live="polite">
        <p v-if="detailLoading" class="device-files__status">正在读取详情…</p>
        <p v-else-if="detailError" class="device-files__status device-files__status--error">
          {{ detailError }}
        </p>
        <div v-else-if="detail" class="device-apps__detail-inner">
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
        </div>

        <div class="device-apps__detail-btns">
          <button
            type="button"
            class="device-apps__btn"
            :disabled="actionBusy || detail?.system"
            :title="detail?.system ? '不建议卸载系统应用' : ''"
            @click="emit('request-uninstall')"
          >
            卸载…
          </button>
          <button
            type="button"
            class="device-apps__btn"
            :disabled="actionBusy"
            @click="emit('freeze-toggle')"
          >
            {{ detail?.enabled ? "冻结" : "解冻" }}
          </button>
          <button
            type="button"
            class="device-apps__btn"
            :disabled="actionBusy"
            @click="emit('extract-apk')"
          >
            提取 APK
          </button>
          <button
            type="button"
            class="device-apps__btn"
            :disabled="!detail?.dataDir"
            @click="emit('open-data-dir')"
          >
            打开 data 目录
          </button>
        </div>
      </div>
    </div>
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
          @click="emit('cancel-uninstall')"
        >
          取消
        </button>
        <button
          type="button"
          class="device-apps__btn device-apps__btn--danger"
          :disabled="actionBusy"
          @click="emit('confirm-uninstall')"
        >
          确认卸载
        </button>
      </div>
    </div>
  </div>
</template>
