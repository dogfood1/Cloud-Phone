<script setup>
import { NAlert, NFormItem, NSpace } from "naive-ui";

import MirrorSettingHelp from "./MirrorSettingHelp.vue";

defineProps({
  label: {
    type: String,
    required: true,
  },
  help: {
    type: String,
    default: "",
  },
  variant: {
    type: String,
    default: "field",
    validator: (value) => ["field", "checkbox", "banner"].includes(value),
  },
  nested: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <NAlert
    v-if="variant === 'banner'"
    type="info"
    :bordered="false"
    :show-icon="false"
    style="margin: 0 0 0.35rem"
  >
    <NSpace justify="space-between" align="flex-start" :size="8">
      <span>{{ label }}</span>
      <MirrorSettingHelp v-if="help" :text="help" />
    </NSpace>
  </NAlert>

  <NFormItem
    v-else-if="variant === 'checkbox'"
    :show-feedback="false"
    :style="nested ? { paddingLeft: '0.75rem' } : null"
  >
    <NSpace justify="space-between" align="center" style="width: 100%">
      <NSpace align="center" :size="8">
        <slot name="control" />
        <span>{{ label }}</span>
      </NSpace>
      <MirrorSettingHelp v-if="help" :text="help" />
    </NSpace>
  </NFormItem>

  <NFormItem
    v-else
    :label="label"
    label-placement="left"
    label-align="left"
    label-width="auto"
    :show-feedback="false"
    :style="nested ? { paddingLeft: '0.75rem' } : null"
  >
    <NSpace align="center" :size="8" style="width: 100%">
      <div style="flex: 1; min-width: 0">
        <slot />
      </div>
      <MirrorSettingHelp v-if="help" :text="help" />
    </NSpace>
  </NFormItem>
</template>
