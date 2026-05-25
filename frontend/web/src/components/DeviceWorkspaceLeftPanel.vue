<script setup>
import { ref } from "vue";

import { DEFAULT_CAST_MODE, DEVICE_CAST_MODES } from "../utils/device-cast-modes.js";

const castMode = ref(DEFAULT_CAST_MODE);
const modes = DEVICE_CAST_MODES;
</script>

<template>
  <aside class="workspace-left" aria-label="投屏设置">
    <div class="workspace-left__section workspace-left__top">
      <label class="workspace-left__label" for="cast-mode-select">投屏模式</label>
      <select id="cast-mode-select" v-model="castMode" class="workspace-left__select">
        <option v-for="mode in modes" :key="mode.id" :value="mode.id">
          {{ mode.label }}
        </option>
      </select>
    </div>

    <div class="workspace-left__section workspace-left__middle" aria-hidden="true" />

    <div class="workspace-left__section workspace-left__bottom">
      <button type="button" class="workspace-left__btn workspace-left__btn--ghost">取消投屏</button>
      <button type="button" class="workspace-left__btn workspace-left__btn--primary">开始投屏</button>
    </div>
  </aside>
</template>
