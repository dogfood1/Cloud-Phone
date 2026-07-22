<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { NModal, NProgress } from "naive-ui";

import UiButton from "./ui/UiButton.vue";

const props = defineProps({
  consentOpen: {
    type: Boolean,
    default: false,
  },
  busy: {
    type: Boolean,
    default: false,
  },
  progressPercent: {
    type: Number,
    default: 0,
  },
  progressLabel: {
    type: String,
    default: "",
  },
  currentPackage: {
    type: String,
    default: "",
  },
  deniedHint: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["allow", "deny"]);

const { t } = useI18n();

const showProgress = computed(() => props.busy && !props.consentOpen);
</script>

<template>
  <NModal
    :show="consentOpen"
    preset="card"
    :title="t('iconHelper.consentTitle')"
    :mask-closable="false"
    :close-on-esc="false"
    style="width: min(420px, 92vw)"
    @update:show="(open) => !open && emit('deny')"
  >
    <p class="icon-helper-consent__body">{{ t("iconHelper.consentBody") }}</p>
    <div class="icon-helper-consent__actions">
      <UiButton variant="ghost" @click="emit('deny')">{{ t("iconHelper.deny") }}</UiButton>
      <UiButton variant="primary" @click="emit('allow')">{{ t("iconHelper.allow") }}</UiButton>
    </div>
  </NModal>

  <NModal
    :show="showProgress"
    preset="card"
    :title="t('iconHelper.extracting')"
    :mask-closable="false"
    :close-on-esc="false"
    :closable="false"
    style="width: min(420px, 92vw)"
  >
    <div class="icon-helper-progress">
      <p class="icon-helper-progress__label">
        {{ progressLabel || t("iconHelper.extracting") }}
        <span v-if="currentPackage"> · {{ currentPackage }}</span>
      </p>
      <NProgress type="line" :percentage="progressPercent" :show-indicator="true" />
    </div>
  </NModal>

  <p v-if="deniedHint && !consentOpen && !showProgress" class="icon-helper-denied">
    {{ t("iconHelper.deniedHint") }}
  </p>
</template>

<style scoped>
.icon-helper-consent__body {
  margin: 0 0 1rem;
  color: var(--muted);
  line-height: 1.5;
  font-size: 0.92rem;
}

.icon-helper-consent__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
}

.icon-helper-progress {
  display: grid;
  gap: 0.55rem;
}

.icon-helper-progress__label {
  margin: 0;
  font-size: 0.9rem;
  color: var(--muted);
  line-height: 1.45;
}

.icon-helper-denied {
  margin: 0.25rem 0 0.65rem;
  font-size: 0.82rem;
  color: var(--muted);
}
</style>
