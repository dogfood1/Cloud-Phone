<script setup>
import { computed } from "vue";
import {
  Apple,
  ArrowLeft,
  Camera,
  File,
  Folder,
  Grid3X3,
  Home,
  Link,
  LogOut,
  Moon,
  Plus,
  Palette,
  RefreshCw,
  User,
  RotateCw,
  Settings,
  Smartphone,
  Sun,
  Terminal,
  Wifi,
  Shield,
} from "lucide-vue-next";

import { DEVICE_TOOLBAR_ICONS } from "../icons/device-toolbar-icons.js";

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  /** Toolbar icons use slightly heavier strokes for legibility. */
  variant: {
    type: String,
    default: "default",
  },
});

const paths = {
  devices:
    "M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm1 14h8",
  sun: "M12 4V2m0 20v-2M4.9 4.9 3.5 3.5m16.4 16.4-1.4-1.4M4 12H2m20 0h-2M4.9 19.1l-1.4 1.4m16.4-16.4-1.4 1.4M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z",
  moon: "M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5Z",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m5 14 5-5-5-5m5 5H9",
  phone:
    "M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm5 13h.01",
  refresh:
    "M21 12a9 9 0 0 1-15 6.7L3 21V16m0-4a9 9 0 0 1 15-6.7L21 3v5h-5",
  /** Lucide file-up — upload to device */
  upload: [
    "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7",
    "M14 2v4a2 2 0 0 0 2 2h4",
    "M12 11v6",
    "M9 14l3-3 3 3",
  ],
  /** Lucide file-down — download from device */
  download: [
    "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7",
    "M14 2v4a2 2 0 0 0 2 2h4",
    "M12 15V9",
    "M9 12l3 3 3-3",
  ],
  shield:
    "M12 3 4 7v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V7l-8-4Z",
  wifi: "M5 9a14 14 0 0 1 14 0M8.5 12.5a9 9 0 0 1 7 0M12 16h.01",
  "arrow-left": "M19 12H5M12 19l-7-7 7-7",
  /** Android robot mark */
  "android-brand": [
    "M8.5 9.5h7A2.5 2.5 0 0 1 18 12v4.5A1.5 1.5 0 0 1 16.5 18h-9A1.5 1.5 0 0 1 6 16.5V12a2.5 2.5 0 0 1 2.5-2.5Z",
    "M9 9.5V8a3 3 0 0 1 6 0v1.5",
    "M9.4 5.6 8 4.2M14.6 5.6 16 4.2",
    "M9.8 13h.01M14.2 13h.01",
    "M8 18v2M16 18v2M5.5 11v5.5M18.5 11v5.5",
  ],
  /** Huawei petal-style mark */
  "huawei-brand": [
    "M12 5.4c.9 0 1.2 1.4.7 2.7-.5 1.2-1.4 2.1-1.8 2.1-.5 0-1.3-.9-1.8-2.1-.5-1.3-.2-2.7.7-2.7",
    "M8.6 6.6c.8-.5 1.8.5 2.1 1.8.2 1.3-.2 2.5-.6 2.8-.4.3-1.6-.1-2.5-1-.9-.9-1.5-2.2-1-2.8",
    "M15.4 6.6c-.8-.5-1.8.5-2.1 1.8-.2 1.3.2 2.5.6 2.8.4.3 1.6-.1 2.5-1 .9-.9 1.5-2.2 1-2.8",
    "M7.2 10.7c.6-.8 2 .1 2.7 1.3.7 1.1 1 2.4.6 2.7-.4.3-1.7.1-3-.5-1.2-.7-2.1-1.7-1.8-2.5",
    "M16.8 10.7c-.6-.8-2 .1-2.7 1.3-.7 1.1-1 2.4-.6 2.7.4.3 1.7.1 3-.5 1.2-.7 2.1-1.7 1.8-2.5",
    "M9.2 17.3h5.6M10 19h4",
  ],
  ...DEVICE_TOOLBAR_ICONS,
};

const iconPaths = computed(() => {
  const value = paths[props.name];

  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
});

const LUCIDE_ICONS = {
  devices: Grid3X3,
  apple: Apple,
  "arrow-left": ArrowLeft,
  camera: Camera,
  plus: Plus,
  file: File,
  folder: Folder,
  home: Home,
  link: Link,
  phone: Smartphone,
  refresh: RefreshCw,
  rotate: RotateCw,
  settings: Settings,
  sun: Sun,
  shield: Shield,
  terminal: Terminal,
  moon: Moon,
  logout: LogOut,
  user: User,
  palette: Palette,
  wifi: Wifi,
};

const lucideIcon = computed(() => LUCIDE_ICONS[props.name] ?? null);
const strokeWidth = computed(() => (props.variant === "toolbar" ? 2 : 1.75));
</script>

<template>
  <component
    :is="lucideIcon"
    v-if="lucideIcon"
    class="app-icon"
    :class="{ 'app-icon--toolbar': variant === 'toolbar' }"
    :stroke-width="strokeWidth"
    :size="24"
    aria-hidden="true"
  />
  <svg
    v-else
    class="app-icon"
    :class="{ 'app-icon--toolbar': variant === 'toolbar' }"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    aria-hidden="true"
  >
    <path
      v-for="(path, index) in iconPaths"
      :key="index"
      :d="path"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
