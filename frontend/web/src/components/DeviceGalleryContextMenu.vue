<script setup>
import { onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";

import { deviceSupportsDisconnect } from "../utils/device-transport.js";

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
  x: {
    type: Number,
    default: 0,
  },
  y: {
    type: Number,
    default: 0,
  },
  device: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["close", "view-details", "disconnect"]);

const { t } = useI18n();

function handleClose() {
  emit("close");
}

function handleViewDetails() {
  emit("view-details");
}

function handleDisconnect() {
  emit("disconnect");
}

function handleDocumentPointerDown(event) {
  const menu = document.querySelector(".device-gallery-menu");

  if (menu && !menu.contains(event.target)) {
    handleClose();
  }
}

function handleDocumentKeydown(event) {
  if (event.key === "Escape") {
    handleClose();
  }
}

onMounted(() => {
  document.addEventListener("pointerdown", handleDocumentPointerDown, true);
  document.addEventListener("keydown", handleDocumentKeydown);
});

onUnmounted(() => {
  document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
  document.removeEventListener("keydown", handleDocumentKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && device"
      class="device-gallery-menu"
      :style="{ top: `${y}px`, left: `${x}px` }"
      role="menu"
      @contextmenu.prevent
    >
      <button type="button" role="menuitem" @click="handleViewDetails">
        {{ t("devices.contextMenu.viewDetails") }}
      </button>
      <button
        v-if="deviceSupportsDisconnect(device)"
        type="button"
        role="menuitem"
        class="device-gallery-menu__danger"
        @click="handleDisconnect"
      >
        {{ t("devices.contextMenu.disconnect") }}
      </button>
    </div>
  </Teleport>
</template>
