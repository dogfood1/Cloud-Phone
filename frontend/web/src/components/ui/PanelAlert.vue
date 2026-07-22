<script setup>
defineProps({
  type: {
    type: String,
    default: "error",
    validator: (value) => ["error", "warning", "info"].includes(value),
  },
  message: {
    type: String,
    required: true,
  },
  actionLabel: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["action"]);
</script>

<template>
  <div class="panel-alert" :class="`panel-alert--${type}`" role="alert">
    <p class="panel-alert__message">{{ message }}</p>
    <button
      v-if="actionLabel"
      type="button"
      class="panel-alert__action"
      @click="emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>
