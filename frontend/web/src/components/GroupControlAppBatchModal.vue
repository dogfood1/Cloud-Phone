<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";

import UiButton from "./ui/UiButton.vue";

const props = defineProps({
  deviceCount: {
    type: Number,
    default: 0,
  },
  busy: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close", "install", "uninstall"]);

const { t } = useI18n();
const mode = ref("install");
const packageName = ref("");
const apkFile = ref(null);
const fileLabel = ref("");

function handleFileChange(event) {
  const file = event.target.files?.[0] ?? null;
  apkFile.value = file;
  fileLabel.value = file?.name ?? "";
}

function handleSubmit() {
  if (props.busy) {
    return;
  }

  if (mode.value === "install") {
    if (!apkFile.value) {
      return;
    }

    emit("install", apkFile.value);
    return;
  }

  const pkg = packageName.value.trim();

  if (!pkg) {
    return;
  }

  emit("uninstall", pkg);
}
</script>

<template>
  <div class="modal-layer" @click.self="emit('close')">
    <section
      class="group-control-app-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="t('groupControl.appModal.title')"
    >
      <header class="group-control-app-modal__header">
        <div>
          <h2>{{ t("groupControl.appModal.title") }}</h2>
          <p>{{ t("groupControl.appModal.desc", { count: deviceCount }) }}</p>
        </div>
        <button
          type="button"
          class="group-control-picker__close"
          :aria-label="t('groupControl.picker.close')"
          @click="emit('close')"
        >
          ×
        </button>
      </header>

      <div class="group-control-app-modal__tabs">
        <button
          type="button"
          class="group-control-app-modal__tab"
          :class="{ 'group-control-app-modal__tab--active': mode === 'install' }"
          @click="mode = 'install'"
        >
          {{ t("groupControl.appModal.installTab") }}
        </button>
        <button
          type="button"
          class="group-control-app-modal__tab"
          :class="{ 'group-control-app-modal__tab--active': mode === 'uninstall' }"
          @click="mode = 'uninstall'"
        >
          {{ t("groupControl.appModal.uninstallTab") }}
        </button>
      </div>

      <div v-if="mode === 'install'" class="group-control-app-modal__body">
        <label class="group-control-app-modal__field">
          <span>{{ t("groupControl.appModal.apkLabel") }}</span>
          <input type="file" accept=".apk,application/vnd.android.package-archive" @change="handleFileChange" />
        </label>
        <p v-if="fileLabel" class="group-control-app-modal__hint">{{ fileLabel }}</p>
      </div>

      <div v-else class="group-control-app-modal__body">
        <label class="group-control-app-modal__field">
          <span>{{ t("groupControl.appModal.packageLabel") }}</span>
          <input
            v-model="packageName"
            type="text"
            placeholder="com.example.app"
            autocomplete="off"
          />
        </label>
        <p class="group-control-app-modal__hint">{{ t("groupControl.appModal.uninstallHint") }}</p>
      </div>

      <footer class="group-control-picker__footer">
        <UiButton variant="ghost" :disabled="busy" @click="emit('close')">
          {{ t("groupControl.picker.cancel") }}
        </UiButton>
        <UiButton variant="primary" :disabled="busy" @click="handleSubmit">
          {{ busy ? t("groupControl.appModal.running") : t("groupControl.appModal.confirm") }}
        </UiButton>
      </footer>
    </section>
  </div>
</template>
