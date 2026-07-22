<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import GroupControlDevicePreview from "./GroupControlDevicePreview.vue";
import UiButton from "./ui/UiButton.vue";

const props = defineProps({
  devices: {
    type: Array,
    required: true,
  },
  screenshotUrl: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(["close", "confirm"]);

const { t } = useI18n();
const selectedSerial = ref(props.devices[0]?.serial ?? "");

const canConfirm = computed(() => Boolean(selectedSerial.value));

function handleConfirm() {
  if (!canConfirm.value) {
    return;
  }

  emit("confirm", selectedSerial.value);
}
</script>

<template>
  <div class="modal-layer" @click.self="emit('close')">
    <section
      class="group-control-master-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="t('groupControl.masterModal.title')"
    >
      <header class="group-control-master-modal__header">
        <div>
          <h2>{{ t("groupControl.masterModal.title") }}</h2>
          <p>{{ t("groupControl.masterModal.desc") }}</p>
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

      <ul class="group-control-master-modal__list">
        <li v-for="device in devices" :key="device.serial">
          <button
            type="button"
            class="group-control-master-modal__item"
            :class="{ 'group-control-master-modal__item--active': selectedSerial === device.serial }"
            @click="selectedSerial = device.serial"
          >
            <GroupControlDevicePreview
              :device="device"
              :screenshot-url="screenshotUrl(device.serial)"
              compact
            />
            <span>{{ device.displayName }}</span>
          </button>
        </li>
      </ul>

      <footer class="group-control-picker__footer">
        <UiButton variant="ghost" @click="emit('close')">
          {{ t("groupControl.picker.cancel") }}
        </UiButton>
        <UiButton variant="primary" :disabled="!canConfirm" @click="handleConfirm">
          {{ t("groupControl.masterModal.confirm") }}
        </UiButton>
      </footer>
    </section>
  </div>
</template>
