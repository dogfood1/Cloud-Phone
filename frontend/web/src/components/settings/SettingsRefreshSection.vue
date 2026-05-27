<script setup>
import { useI18n } from "vue-i18n";

defineProps({
  settingsForm: {
    type: Object,
    required: true,
  },
  settingsFeedback: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["save"]);
const { t } = useI18n();
</script>

<template>
  <div class="settings-section">
    <h3 class="settings-section__title">{{ t("settings.sections.refresh.title") }}</h3>
    <p class="settings-section__desc">{{ t("settings.sections.refresh.desc") }}</p>

    <form class="settings-form settings-form--section" @submit.prevent="emit('save')">
      <dl class="settings-rows">
        <div class="settings-row">
          <dt class="settings-row__label">{{ t("settings.deviceInterval") }}</dt>
          <dd class="settings-row__control">
            <label class="field field--compact">
              <span class="sr-only">{{ t("settings.deviceInterval") }}</span>
              <div class="field__control">
                <input
                  v-model.number="settingsForm.deviceListIntervalSeconds"
                  type="number"
                  min="1"
                  max="120"
                  step="1"
                  required
                />
              </div>
            </label>
          </dd>
        </div>
        <div class="settings-row">
          <dt class="settings-row__label">{{ t("settings.screenshotInterval") }}</dt>
          <dd class="settings-row__control">
            <label class="field field--compact">
              <span class="sr-only">{{ t("settings.screenshotInterval") }}</span>
              <div class="field__control">
                <input
                  v-model.number="settingsForm.screenshotIntervalSeconds"
                  type="number"
                  min="1"
                  max="120"
                  step="1"
                  required
                />
              </div>
            </label>
          </dd>
        </div>
      </dl>
      <p class="settings-form__hint">{{ t("settings.intervalHint") }}</p>
      <p v-if="settingsFeedback" class="feedback">{{ settingsFeedback }}</p>
      <div class="settings-section__actions">
        <button class="primary-button" type="submit">{{ t("settings.save") }}</button>
      </div>
    </form>
  </div>
</template>
