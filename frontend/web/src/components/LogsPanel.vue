<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { NButton, NInput, NPopconfirm } from "naive-ui";

import "../assets/logs-page.css";
import { useAppEventLog } from "../composables/useAppEventLog.js";

const { t } = useI18n();

const {
  filteredEntries,
  levelCounts,
  activeLevel,
  activeCategory,
  searchQuery,
  logLevels,
  logCategories,
  toggleExpanded,
  isExpanded,
  clearLog,
  formatDetails,
} = useAppEventLog();

const levelOptions = computed(() => [
  { id: "all", label: t("logs.levelAll"), count: levelCounts.value.all },
  ...logLevels.map((level) => ({
    id: level,
    label: t(`logs.level${level.charAt(0).toUpperCase()}${level.slice(1)}`),
    count: levelCounts.value[level],
  })),
]);

const categoryOptions = computed(() => [
  { id: "all", label: t("logs.categoryAll") },
  ...logCategories.map((category) => ({
    id: category,
    label: t(`logs.categories.${category}`),
  })),
]);

const emptyMessage = computed(() =>
  searchQuery.value.trim() || activeLevel.value !== "all" || activeCategory.value !== "all"
    ? t("logs.emptyFiltered")
    : t("logs.empty"),
);
</script>

<template>
  <section class="logs-page">
    <header class="panel-header">
      <div>
        <p class="eyebrow">{{ t("logs.eyebrow") }}</p>
        <h2>{{ t("logs.title") }}</h2>
        <p class="panel-header__desc">{{ t("logs.desc") }}</p>
      </div>
      <div class="panel-header__actions">
        <span class="panel-header__meta">{{ t("logs.count", { count: filteredEntries.length }) }}</span>
      </div>
    </header>

    <div class="logs-page__toolbar">
      <NInput
        v-model:value="searchQuery"
        class="logs-page__search"
        clearable
        :placeholder="t('logs.searchPlaceholder')"
      />
      <NPopconfirm @positive-click="clearLog">
        <template #trigger>
          <NButton secondary size="small">{{ t("logs.clear") }}</NButton>
        </template>
        {{ t("logs.clear") }}?
      </NPopconfirm>
    </div>

    <div class="logs-page__filters">
      <div class="logs-page__filter-group" role="group" :aria-label="t('logs.title')">
        <button
          v-for="option in levelOptions"
          :key="option.id"
          type="button"
          class="logs-page__filter-btn"
          :class="{ 'logs-page__filter-btn--active': activeLevel === option.id }"
          @click="activeLevel = option.id"
        >
          <span>{{ option.label }}</span>
          <span class="logs-page__filter-count">{{ option.count }}</span>
        </button>
      </div>
      <div class="logs-page__filter-group">
        <button
          v-for="option in categoryOptions"
          :key="option.id"
          type="button"
          class="logs-page__filter-btn"
          :class="{ 'logs-page__filter-btn--active': activeCategory === option.id }"
          @click="activeCategory = option.id"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div v-if="filteredEntries.length" class="logs-page__list">
      <article
        v-for="entry in filteredEntries"
        :key="entry.id"
        class="logs-page__entry"
        :class="`logs-page__entry--${entry.level}`"
      >
        <button
          type="button"
          class="logs-page__entry-header"
          :aria-expanded="isExpanded(entry.id)"
          @click="toggleExpanded(entry.id)"
        >
          <div class="logs-page__entry-badges">
            <span class="logs-page__badge" :class="`logs-page__badge--${entry.level}`">
              {{ entry.level }}
            </span>
            <span class="logs-page__badge logs-page__badge--category">
              {{ t(`logs.categories.${entry.category}`) }}
            </span>
          </div>

          <div class="logs-page__entry-main">
            <p class="logs-page__entry-message">{{ entry.message }}</p>
            <div class="logs-page__entry-meta">
              <span>{{ entry.displayTime }}</span>
              <span v-if="entry.deviceName">{{ entry.deviceName }}</span>
              <span v-if="entry.deviceSerial">{{ entry.deviceSerial }}</span>
              <span>{{ entry.event }}</span>
            </div>
          </div>

          <span class="logs-page__entry-chevron" aria-hidden="true">
            {{ isExpanded(entry.id) ? "▾" : "▸" }}
          </span>
        </button>

        <div v-if="isExpanded(entry.id)" class="logs-page__entry-details">
          <pre v-if="entry.details" class="logs-page__details-pre">{{ formatDetails(entry.details) }}</pre>
          <pre v-else class="logs-page__details-pre">{{ entry.event }}</pre>
        </div>
      </article>
    </div>

    <div v-else class="logs-page__empty">
      {{ emptyMessage }}
    </div>
  </section>
</template>
