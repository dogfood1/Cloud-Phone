<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";

import AppIcon from "./AppIcon.vue";

const props = defineProps({
  batchMode: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "power",
  "volume",
  "open-apps",
  "open-batch",
  "stop-batch",
]);

const { t } = useI18n();
const powerMenuOpen = ref(false);
const volumeMenuOpen = ref(false);

const powerActions = [
  { id: "screen-on", icon: "screen-on", labelKey: "groupControl.actions.powerOn" },
  { id: "screen-off", icon: "screen-off", labelKey: "groupControl.actions.powerOff" },
];

const volumeActions = [
  { id: "volume-mute", icon: "volume-mute", labelKey: "groupControl.actions.volumeMute" },
  { id: "volume-up", icon: "volume-up", labelKey: "groupControl.actions.volumeUp" },
  { id: "volume-down", icon: "volume-down", labelKey: "groupControl.actions.volumeDown" },
];

function closeMenus() {
  powerMenuOpen.value = false;
  volumeMenuOpen.value = false;
}

function togglePowerMenu() {
  volumeMenuOpen.value = false;
  powerMenuOpen.value = !powerMenuOpen.value;
}

function toggleVolumeMenu() {
  powerMenuOpen.value = false;
  volumeMenuOpen.value = !volumeMenuOpen.value;
}

function handlePower(actionId) {
  emit("power", actionId);
  closeMenus();
}

function handleVolume(actionId) {
  emit("volume", actionId);
  closeMenus();
}
</script>

<template>
  <div class="group-control-action-bar" @click.self="closeMenus">
    <div class="group-control-action-bar__group">
      <div class="group-control-action-bar__anchor">
        <button
          type="button"
          class="group-control-action-bar__btn"
          :class="{ 'group-control-action-bar__btn--open': powerMenuOpen }"
          :aria-expanded="powerMenuOpen"
          @click="togglePowerMenu"
        >
          <AppIcon name="power" variant="toolbar" />
          <span>{{ t("groupControl.actions.power") }}</span>
        </button>
        <div v-show="powerMenuOpen" class="group-control-action-bar__menu" role="menu">
          <button
            v-for="action in powerActions"
            :key="action.id"
            type="button"
            class="group-control-action-bar__menu-item"
            role="menuitem"
            @click="handlePower(action.id)"
          >
            <AppIcon :name="action.icon" variant="toolbar" />
            <span>{{ t(action.labelKey) }}</span>
          </button>
        </div>
      </div>

      <div class="group-control-action-bar__anchor">
        <button
          type="button"
          class="group-control-action-bar__btn"
          :class="{ 'group-control-action-bar__btn--open': volumeMenuOpen }"
          :aria-expanded="volumeMenuOpen"
          @click="toggleVolumeMenu"
        >
          <AppIcon name="volume" variant="toolbar" />
          <span>{{ t("groupControl.actions.volume") }}</span>
        </button>
        <div v-show="volumeMenuOpen" class="group-control-action-bar__menu" role="menu">
          <button
            v-for="action in volumeActions"
            :key="action.id"
            type="button"
            class="group-control-action-bar__menu-item"
            role="menuitem"
            @click="handleVolume(action.id)"
          >
            <AppIcon :name="action.icon" variant="toolbar" />
            <span>{{ t(action.labelKey) }}</span>
          </button>
        </div>
      </div>

      <button type="button" class="group-control-action-bar__btn" @click="emit('open-apps')">
        <AppIcon name="apps" variant="toolbar" />
        <span>{{ t("groupControl.actions.apps") }}</span>
      </button>

      <button
        v-if="!batchMode"
        type="button"
        class="group-control-action-bar__btn"
        @click="emit('open-batch')"
      >
        <AppIcon name="group-control" variant="toolbar" />
        <span>{{ t("groupControl.actions.batchControl") }}</span>
      </button>
      <button
        v-else
        type="button"
        class="group-control-action-bar__btn group-control-action-bar__btn--active"
        @click="emit('stop-batch')"
      >
        <AppIcon name="group-control" variant="toolbar" />
        <span>{{ t("groupControl.actions.stopBatch") }}</span>
      </button>
    </div>
  </div>
</template>
