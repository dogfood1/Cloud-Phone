<script setup>
defineProps({
  name: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    default: 16,
  },
});
</script>

<template>
  <svg
    class="win11-icon"
    :width="size"
    :height="size"
    viewBox="0 0 16 16"
    aria-hidden="true"
    focusable="false"
  >
    <template v-if="name === 'start'">
      <rect x="1" y="1" width="6.5" height="6.5" fill="#0078d4" />
      <rect x="8.5" y="1" width="6.5" height="6.5" fill="#0078d4" />
      <rect x="1" y="8.5" width="6.5" height="6.5" fill="#0078d4" />
      <rect x="8.5" y="8.5" width="6.5" height="6.5" fill="#0078d4" />
    </template>

    <template v-else-if="name === 'task-view'">
      <rect x="2" y="3" width="7" height="10" rx="0.8" fill="#fff" stroke="#1f1f1f" stroke-width="1" />
      <rect x="7" y="5" width="7" height="8" rx="0.8" fill="#fff" stroke="#1f1f1f" stroke-width="1" />
    </template>

    <template v-else-if="name === 'edge'">
      <circle cx="8" cy="8" r="7" fill="#0c59a7" />
      <path
        d="M11.5 4.5c-1.8-.8-4.2-.2-5.4 1.8-1.1 1.8-.6 4.2 1.1 5.2 1.4.8 3.3.3 4.2-1.1.6-1 .2-2.3-.8-2.8-.9-.5-2-.1-2.4.7-.3.6.1 1.2.7 1.3"
        fill="none"
        stroke="#5fd38d"
        stroke-width="1.2"
        stroke-linecap="round"
      />
    </template>

    <template v-else-if="name === 'search'">
      <circle cx="7" cy="7" r="4.2" fill="none" stroke="currentColor" stroke-width="1.3" />
      <path d="M10.2 10.2 13.5 13.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
    </template>

    <template v-else-if="name === 'explorer'">
      <path d="M2 4.5h4.2l1-1.5h6.8v9.5H2z" fill="#fcd116" stroke="#c8a000" stroke-width="0.6" />
      <path d="M2 6.5h12v6.5H2z" fill="#ffce3d" />
      <path d="M6.2 3 7.2 4.5H14v1.5H2V4.5z" fill="#3b9cff" />
    </template>

    <template v-else-if="name === 'mic'">
      <rect x="6.5" y="3" width="3" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.1" />
      <path d="M4.5 8a3.5 3.5 0 0 0 7 0M8 11.5V13" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" />
    </template>

    <template v-else-if="name === 'cloud'">
      <path
        d="M4.5 11h6.8a2.2 2.2 0 0 0 .2-4.4A3.2 3.2 0 0 0 5 4.6 2.8 2.8 0 0 0 4.5 11Z"
        fill="none"
        stroke="#0078d4"
        stroke-width="1.1"
      />
    </template>

    <template v-else-if="name === 'tray-dot'">
      <circle cx="8" cy="8" r="5" fill="#7b61ff" />
    </template>

    <template v-else-if="name === 'wechat'">
      <circle cx="8" cy="8" r="6" fill="#07c160" />
      <ellipse cx="6.2" cy="7.2" rx="2.2" ry="1.8" fill="#fff" />
      <ellipse cx="9.8" cy="8.8" rx="2.4" ry="2" fill="#fff" />
    </template>

    <template v-else-if="name === 'doc'">
      <rect x="4" y="2.5" width="8" height="11" rx="1" fill="#fff" stroke="#666" stroke-width="0.8" />
      <path d="M6 6h4M6 8h4M6 10h2.5" stroke="#888" stroke-width="0.8" stroke-linecap="round" />
    </template>

    <template v-else-if="name === 'brightness'">
      <circle cx="8" cy="8" r="2.2" fill="none" stroke="currentColor" stroke-width="1.1" />
      <path
        d="M8 1.5v1.4M8 13.1v1.4M1.5 8h1.4M13.1 8h1.4M3.4 3.4l1 1M11.6 11.6l1 1M12.6 3.4l-1 1M4.4 11.6l-1 1"
        stroke="currentColor"
        stroke-width="1"
        stroke-linecap="round"
      />
    </template>

    <template v-else-if="name === 'bluetooth'">
      <path
        d="M8 2.5 10.8 5.3 8 7.5v1l2.8 2.2L8 13.5V2.5Zm0 5 1.8-1.4L8 5.2v2.3Zm0 3.8 1.8 1.4L8 10.8V8.3Z"
        fill="#0078d4"
      />
    </template>

    <template v-else-if="name === 'keyboard'">
      <rect x="2" y="5" width="12" height="6.5" rx="1" fill="none" stroke="currentColor" stroke-width="1" />
      <path d="M4.5 8h1.2M6.8 8h1.2M9.1 8h1.2M11.4 8h1.2M5.6 10h4.8" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" />
    </template>

    <template v-else-if="name === 'wifi'">
      <path
        d="M2.5 6.2a9.5 9.5 0 0 1 11 0M4.8 8.5a6.5 6.5 0 0 1 6.4 0M7.1 10.8a3.5 3.5 0 0 1 1.8 0M8 13h.01"
        fill="none"
        stroke="currentColor"
        stroke-width="1.15"
        stroke-linecap="round"
      />
    </template>

    <template v-else-if="name === 'volume'">
      <path d="M3.5 6.2H5.8L9.2 3.8v8.4L5.8 9.8H3.5z" fill="currentColor" />
      <path
        d="M11 6.2a2.8 2.8 0 0 1 0 3.6M12.4 4.6a5 5 0 0 1 0 6.8"
        fill="none"
        stroke="currentColor"
        stroke-width="1"
        stroke-linecap="round"
      />
    </template>

    <template v-else-if="name === 'volume-mute'">
      <path d="M3.5 6.2H5.8L9.2 3.8v8.4L5.8 9.8H3.5z" fill="currentColor" />
      <path d="M12.2 5.8 10 8m0 0-2.2 2.2M10 8l2.2 2.2M10 8 7.8 5.8" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
    </template>

    <template v-else-if="name === 'wifi-off'">
      <path
        d="M2.5 6.2a9.5 9.5 0 0 1 11 0M4.8 8.5a6.5 6.5 0 0 1 6.4 0M7.1 10.8a3.5 3.5 0 0 1 1.8 0"
        fill="none"
        stroke="currentColor"
        stroke-width="1.15"
        stroke-linecap="round"
        opacity="0.35"
      />
      <path d="M3.5 12.5 12.5 3.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" />
    </template>

    <template v-else-if="name === 'settings-gear'">
      <circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1" />
      <path
        d="M8 1.8v1.5M8 12.7v1.5M1.8 8h1.5M12.7 8h1.5M3.7 3.7l1.1 1.1M11.2 11.2l1.1 1.1M12.3 3.7l-1.1 1.1M4.8 11.2l-1.1 1.1"
        stroke="currentColor"
        stroke-width="0.9"
        stroke-linecap="round"
      />
    </template>

    <template v-else-if="name === 'chevron-up'">
      <path d="M4 10 8 6l4 4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    </template>

    <template v-else-if="name === 'chevron-down'">
      <path d="M4 6 8 10l4-4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    </template>

    <template v-else-if="name === 'focus-assist'">
      <path
        d="M8 2.5a4.2 4.2 0 0 1 4.2 4.2c0 2.3-1.9 3.6-3.4 4.8-.8.6-1.3 1.2-1.6 1.8-.2.4-.4.9-.4 1.4V14"
        fill="none"
        stroke="currentColor"
        stroke-width="1"
        stroke-linecap="round"
      />
      <path d="M6.8 13.2h2.4M7.2 14.8h1.6" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" />
      <path d="M11.2 3.2h1.2M12.2 4.2v1.2" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" />
      <text x="10.8" y="5.8" fill="currentColor" font-size="3.2" font-family="Segoe UI, sans-serif">z</text>
      <text x="12.2" y="5.8" fill="currentColor" font-size="3.2" font-family="Segoe UI, sans-serif">z</text>
    </template>

    <template v-else-if="name === 'refresh'">
      <path
        d="M13.2 8A5.2 5.2 0 1 1 11.4 3.6"
        fill="none"
        stroke="currentColor"
        stroke-width="1.2"
        stroke-linecap="round"
      />
      <path d="M11 2.4h2.4V4.8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    </template>
  </svg>
</template>
