<script setup>
import AppIcon from "./AppIcon.vue";
import ThemeToggle from "./ThemeToggle.vue";

const props = defineProps({
  activeTab: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["update:activeTab", "logout"]);

defineEmits(["logout"]);

const tabs = [
  { id: "devices", label: "设备", icon: "devices" },
  { id: "settings", label: "设置", icon: "settings" },
];
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar__brand">
      <div class="sidebar__logo" aria-hidden="true">
        <AppIcon name="phone" />
      </div>
      <div>
        <p class="eyebrow">Cloud Phone</p>
        <strong>设备控制台</strong>
      </div>
    </div>

    <nav class="sidebar__tabs" aria-label="主导航">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="sidebar__tab"
        :class="{ 'sidebar__tab--active': props.activeTab === tab.id }"
        @click="emit('update:activeTab', tab.id)"
      >
        <AppIcon :name="tab.icon" />
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <div class="sidebar__footer">
      <ThemeToggle />
      <button type="button" class="sidebar__logout" @click="$emit('logout')">
        <AppIcon name="logout" />
        <span>退出登录</span>
      </button>
    </div>
  </aside>
</template>
