<script setup>
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<template>
  <section class="group-control-view">
    <header class="panel-header">
      <div>
        <p class="eyebrow">{{ t("groupControl.eyebrow") }}</p>
        <h2>{{ t("groupControl.title") }}</h2>
        <p class="panel-header__desc">{{ t("groupControl.desc") }}</p>
      </div>
    </header>

    <div class="empty-state">
      <p>{{ t("groupControl.comingSoon") }}</p>
      <span>{{ t("groupControl.comingSoonHint") }}</span>
    </div>
  </section>
</template>
