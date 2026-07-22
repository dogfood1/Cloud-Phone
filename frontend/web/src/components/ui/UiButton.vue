<script setup>
import { computed } from "vue";
import { NButton } from "naive-ui";

const props = defineProps({
  variant: {
    type: String,
    default: "primary",
    validator: (value) => ["primary", "secondary", "ghost"].includes(value),
  },
  block: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  size: {
    type: String,
    default: "medium",
  },
  attrType: {
    type: String,
    default: "button",
  },
});

const buttonType = computed(() => (props.variant === "primary" ? "primary" : "default"));
const quaternary = computed(() => props.variant === "ghost");
const secondary = computed(() => props.variant === "secondary");
</script>

<template>
  <NButton
    :type="buttonType"
    :secondary="secondary"
    :quaternary="quaternary"
    :block="block"
    :loading="loading"
    :disabled="disabled"
    :size="size"
    :attr-type="attrType"
    class="ui-button"
  >
    <slot />
  </NButton>
</template>
