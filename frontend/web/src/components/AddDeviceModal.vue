<script setup>
import { useI18n } from "vue-i18n";

import "../assets/add-device-modal.css";
import AppIcon from "./AppIcon.vue";

const emit = defineEmits(["close"]);

const { t } = useI18n();

const platforms = [
  { id: "android", icon: "phone" },
  { id: "harmony", icon: "harmony" },
  { id: "apple", icon: "apple" },
];
</script>

<template>
  <div class="modal-layer" @click.self="emit('close')">
    <section
      class="add-device-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="t('devices.addDeviceModal.title')"
    >
      <header class="add-device-modal__header">
        <div>
          <h2>{{ t("devices.addDeviceModal.title") }}</h2>
          <p>{{ t("devices.addDeviceModal.desc") }}</p>
        </div>
        <button
          type="button"
          class="add-device-modal__close"
          :aria-label="t('devices.addDeviceModal.close')"
          @click="emit('close')"
        >
          ×
        </button>
      </header>

      <div class="add-device-modal__grid">
        <article
          v-for="item in platforms"
          :key="item.id"
          class="add-device-modal__card add-device-modal__card--disabled"
          :aria-disabled="true"
        >
          <AppIcon :name="item.icon" />
          <h3>{{ t(`devices.addDeviceModal.platforms.${item.id}`) }}</h3>
          <p class="add-device-modal__badge">{{ t("devices.addDeviceModal.comingSoon") }}</p>
        </article>
      </div>
    </section>
  </div>
</template>
