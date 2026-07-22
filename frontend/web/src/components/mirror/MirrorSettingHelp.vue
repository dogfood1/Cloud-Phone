<script setup>
import HelpHint from "../ui/HelpHint.vue";

defineProps({
  text: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    default: "",
  },
});
</script>

<template>
  <HelpHint :content="text" :title="title || text" size="sm" />
</template>
