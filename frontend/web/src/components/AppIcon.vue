<script setup>
import { computed } from "vue";

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
});

const paths = {
  devices:
    "M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm1 14h8",
  settings:
    "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm8.5 4a7.4 7.4 0 0 0 .1-1 7.4 7.4 0 0 0-.1-1l1.8-1.4-1.3-2.2-2.1.8a7.6 7.6 0 0 0-1.7-1l-.3-2.3h-2.6l-.3 2.3a7.6 7.6 0 0 0-1.7 1l-2.1-.8-1.3 2.2L3.5 10a7.4 7.4 0 0 0-.1 1 7.4 7.4 0 0 0 .1 1L1.7 12.4l1.3 2.2 2.1-.8a7.6 7.6 0 0 0 1.7 1l.3 2.3h2.6l.3-2.3a7.6 7.6 0 0 0 1.7-1l2.1.8 1.3-2.2 1.8 1.4Z",
  sun: "M12 4V2m0 20v-2M4.9 4.9 3.5 3.5m16.4 16.4-1.4-1.4M4 12H2m20 0h-2M4.9 19.1l-1.4 1.4m16.4-16.4-1.4 1.4M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z",
  moon: "M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5Z",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m5 14 5-5-5-5m5 5H9",
  phone:
    "M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm5 13h.01",
  refresh:
    "M21 12a9 9 0 0 1-15 6.7L3 21V16m0-4a9 9 0 0 1 15-6.7L21 3v5h-5",
  shield:
    "M12 3 4 7v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V7l-8-4Z",
  wifi: "M5 9a14 14 0 0 1 14 0M8.5 12.5a9 9 0 0 1 7 0M12 16h.01",
  "arrow-left": "M19 12H6m0 0 6 6m-6-6 6-6",
  recents: "M4 7h5v5H4V7Zm11 0h5v5h-5V7Zm-11 8h5v5H4v-5Zm11 0h5v5h-5v-5Z",
  home: "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9.5Z",
  "screen-off": "M4 6h16v10H4V6Zm2 12h12",
  power: ["M12 3v6", "M12 19a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"],
  rotate: "M16 4h2v4h-4V6h2a6 6 0 0 1 1 11.3M8 20H6v-4h4v2H8a6 6 0 0 1-1-11.3",
  volume: ["M5 9v6h3l5 4V5L8 9H5Z", "M16 9a4 4 0 0 1 0 6", "M18 7a7 7 0 0 1 0 10"],
  camera: "M4 8h3l2-2h6l2 2h3v10H4V8Zm8 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  record: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  folder: "M4 7h5l2 2h9v9H4V7Z",
  apps: "M5 5h4v4H5V5Zm10 0h4v4h-4V5ZM5 15h4v4H5v-4Zm10 0h4v4h-4v-4Z",
  terminal: "M5 6h14v12H5V6Zm2 4 3 3-3 3",
};

const iconPaths = computed(() => {
  const value = paths[props.name];

  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
});
</script>

<template>
  <svg class="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
    <path
      v-for="(path, index) in iconPaths"
      :key="index"
      :d="path"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
