<script setup>
import { useI18n } from "vue-i18n";

import UiButton from "./ui/UiButton.vue";

const props = defineProps({
  title: {
    type: String,
    default: "",
  },
  lines: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["close"]);

const { t } = useI18n();
</script>

<template>
  <div class="modal-layer" @click.self="emit('close')">
    <section
      class="group-control-result-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <header class="group-control-result-modal__header">
        <h2>{{ title }}</h2>
        <button
          type="button"
          class="group-control-picker__close"
          :aria-label="t('groupControl.picker.close')"
          @click="emit('close')"
        >
          ×
        </button>
      </header>

      <ul class="group-control-result-modal__list">
        <li
          v-for="line in lines"
          :key="line.serial"
          class="group-control-result-modal__item"
          :class="{
            'group-control-result-modal__item--ok': line.ok,
            'group-control-result-modal__item--fail': !line.ok,
          }"
        >
          <strong>{{ line.serial }}</strong>
          <span>{{ line.message }}</span>
        </li>
      </ul>

      <footer class="group-control-picker__footer">
        <UiButton variant="primary" @click="emit('close')">
          {{ t("groupControl.resultModal.close") }}
        </UiButton>
      </footer>
    </section>
  </div>
</template>
