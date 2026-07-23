<script setup>
import { toRef } from "vue";
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";

import IconHelperGatePanel from "../IconHelperGatePanel.vue";
import { useStartMenuApps } from "../../composables/useStartMenuApps.js";

const emit = defineEmits(["launch"]);

const props = defineProps({
  serial: {
    type: String,
    default: "",
  },
  active: {
    type: Boolean,
    default: false,
  },
});

const { t } = useI18n();
const {
  consentDialogOpen,
  progress,
  progressPercent,
  showProgressUi,
  packageNamesOnly,
  answerConsent,
  searchQuery,
  apps,
  loading,
  errorMessage,
  hasLoadedOnce,
  gateBusy,
  showDeniedHint,
  progressLabel,
  filteredApps,
  isSearching,
  initialsFor,
  displayName,
  launchPayload,
} = useStartMenuApps({
  serial: toRef(props, "serial"),
  active: toRef(props, "active"),
  t,
});

function launchApp(app) {
  emit("launch", launchPayload(app));
}
</script>

<template>
  <div class="win11-start-menu">
    <IconHelperGatePanel
      :consent-open="consentDialogOpen"
      :busy="showProgressUi"
      :progress-percent="progressPercent"
      :progress-label="progressLabel"
      :current-package="progress.current"
      :denied-hint="showDeniedHint"
      @allow="answerConsent(true)"
      @deny="answerConsent(false)"
    />

    <div class="win11-start-menu__search">
      <Icon icon="lucide:search" class="win11-start-menu__search-icon" :width="16" :height="16" />
      <input
        v-model="searchQuery"
        class="win11-start-menu__search-input"
        type="search"
        :placeholder="t('iconHelper.searchApps')"
        autocomplete="off"
        spellcheck="false"
      />
    </div>

    <div class="win11-start-menu__body">
      <p v-if="loading && !hasLoadedOnce && !gateBusy" class="win11-start-menu__status">
        {{ t("iconHelper.loadingApps") }}
      </p>
      <p v-else-if="errorMessage && !apps.length" class="win11-start-menu__status is-error">
        {{ errorMessage }}
      </p>
      <p v-else-if="isSearching && !filteredApps.length" class="win11-start-menu__status">
        {{ t("iconHelper.noMatch") }}
      </p>
      <p v-else-if="!filteredApps.length && !gateBusy && !loading" class="win11-start-menu__status">
        {{ t("iconHelper.emptyApps") }}
      </p>

      <ul v-else-if="isSearching && filteredApps.length" class="win11-start-menu__search-list">
        <li v-for="app in filteredApps" :key="`${app.packageName}:${app.activity}`">
          <button type="button" class="win11-start-menu__search-item" @click="launchApp(app)">
            <span class="win11-start-menu__search-icon-wrap" aria-hidden="true">
              <img v-if="app.iconDataUrl && !packageNamesOnly" :src="app.iconDataUrl" alt="" />
              <span v-else>{{ initialsFor(app) }}</span>
            </span>
            <span class="win11-start-menu__search-text">
              <strong>{{ displayName(app) }}</strong>
              <small>{{ t("iconHelper.appKind") }}</small>
            </span>
          </button>
        </li>
      </ul>

      <template v-else-if="filteredApps.length">
        <div class="win11-start-menu__grid">
          <button
            v-for="app in filteredApps"
            :key="`${app.packageName}:${app.activity}`"
            type="button"
            class="win11-start-menu__app"
            :title="displayName(app)"
            @click="launchApp(app)"
          >
            <span class="win11-start-menu__app-icon" aria-hidden="true">
              <img v-if="app.iconDataUrl && !packageNamesOnly" :src="app.iconDataUrl" alt="" />
              <span v-else>{{ initialsFor(app) }}</span>
            </span>
            <span class="win11-start-menu__app-name">{{ displayName(app) }}</span>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
