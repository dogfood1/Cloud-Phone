<script setup>
import ThemeToggle from "./ThemeToggle.vue";

const activeTab = defineModel("activeTab", { type: String, required: true });

defineEmits(["logout"]);
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar__brand">
      <p class="eyebrow">Cloud Phone</p>
      <strong>控制台</strong>
    </div>
    <nav class="sidebar__tabs">
      <button
        type="button"
        class="sidebar__tab"
        :class="{ 'sidebar__tab--active': activeTab === 'console' }"
        @click="activeTab = 'console'"
      >
        控制台
      </button>
      <button
        type="button"
        class="sidebar__tab"
        :class="{ 'sidebar__tab--active': activeTab === 'devices' }"
        @click="activeTab = 'devices'"
      >
        设备
      </button>
      <button
        type="button"
        class="sidebar__tab"
        :class="{ 'sidebar__tab--active': activeTab === 'settings' }"
        @click="activeTab = 'settings'"
      >
        设置
      </button>
    </nav>
    <div class="sidebar__footer">
      <ThemeToggle />
      <button type="button" class="sidebar__logout" @click="$emit('logout')">退出登录</button>
    </div>
  </aside>
</template>
