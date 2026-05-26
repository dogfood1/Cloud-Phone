<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { NEmpty, NInput, NPopover, NScrollbar, NText } from "naive-ui";

import { filterSelectOptions, findSelectOptionLabel } from "../../utils/searchable-select.js";

const props = defineProps({
  value: {
    type: [String, Number],
    default: null,
  },
  options: {
    type: Array,
    default: () => [],
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  placeholder: {
    type: String,
    default: "请选择",
  },
  searchPlaceholder: {
    type: String,
    default: "搜索…",
  },
  size: {
    type: String,
    default: "small",
  },
});

const emit = defineEmits(["update:value"]);

const showMenu = ref(false);
const query = ref("");
const triggerRef = ref(null);
const searchInputRef = ref(null);
const menuWidth = ref("");

const selectedLabel = computed(() => findSelectOptionLabel(props.options, props.value));

const filteredOptions = computed(() => filterSelectOptions(props.options, query.value));

const isEmpty = computed(() => {
  if (!filteredOptions.value.length) {
    return true;
  }

  return filteredOptions.value.every((item) => {
    if (item.type === "group" || Array.isArray(item.children)) {
      return !item.children?.length;
    }
    return false;
  });
});

function syncMenuWidth() {
  const el = triggerRef.value?.$el ?? triggerRef.value;
  if (el?.offsetWidth) {
    menuWidth.value = `${el.offsetWidth}px`;
  }
}

function toggleMenu() {
  if (props.disabled) {
    return;
  }

  if (showMenu.value) {
    closeMenu();
    return;
  }

  syncMenuWidth();
  showMenu.value = true;
}

function closeMenu() {
  showMenu.value = false;
}

function selectValue(nextValue) {
  emit("update:value", nextValue);
  closeMenu();
}

function isSelected(optionValue) {
  return props.value === optionValue;
}

watch(showMenu, async (open) => {
  if (!open) {
    query.value = "";
    return;
  }

  syncMenuWidth();
  await nextTick();
  searchInputRef.value?.focus?.();
});
</script>

<template>
  <NPopover
    v-model:show="showMenu"
    trigger="manual"
    placement="bottom-start"
    :show-arrow="false"
    display-directive="show"
    :disabled="disabled"
    :style="{ width: '100%' }"
    content-style="padding: 0"
  >
    <template #trigger>
      <div ref="triggerRef" class="mirror-searchable-select__trigger">
        <NInput
          readonly
          :size="size"
          :value="selectedLabel"
          :placeholder="placeholder"
          :disabled="disabled"
          @click="toggleMenu"
        >
          <template #suffix>
            <span class="mirror-searchable-select__arrow" aria-hidden="true">▾</span>
          </template>
        </NInput>
      </div>
    </template>

    <div class="mirror-searchable-select__menu" :style="{ width: menuWidth || '100%' }">
      <div class="mirror-searchable-select__search">
        <NInput
          ref="searchInputRef"
          v-model:value="query"
          :size="size"
          :placeholder="searchPlaceholder"
          clearable
          @keydown.esc="closeMenu"
          @click.stop
        />
      </div>

      <NScrollbar style="max-height: 16rem">
        <div class="mirror-searchable-select__options" role="listbox">
          <template v-for="(item, index) in filteredOptions" :key="index">
            <template v-if="item.type === 'group' || item.children?.length">
              <div v-if="item.label" class="mirror-searchable-select__group">
                {{ item.label }}
              </div>
              <button
                v-for="child in item.children"
                :key="child.value"
                type="button"
                class="mirror-searchable-select__option"
                :class="{ 'mirror-searchable-select__option--active': isSelected(child.value) }"
                :disabled="child.disabled"
                role="option"
                :aria-selected="isSelected(child.value)"
                @click="selectValue(child.value)"
              >
                {{ child.label }}
              </button>
            </template>
            <button
              v-else
              type="button"
              class="mirror-searchable-select__option"
              :class="{ 'mirror-searchable-select__option--active': isSelected(item.value) }"
              :disabled="item.disabled"
              role="option"
              :aria-selected="isSelected(item.value)"
              @click="selectValue(item.value)"
            >
              {{ item.label }}
            </button>
          </template>

          <NEmpty v-if="isEmpty" size="small" description="无匹配项" style="padding: 0.75rem" />
        </div>
      </NScrollbar>
    </div>
  </NPopover>
</template>

<style scoped>
.mirror-searchable-select__trigger {
  width: 100%;
  cursor: pointer;
}

.mirror-searchable-select__arrow {
  color: var(--n-text-color-3);
  font-size: 0.75rem;
  pointer-events: none;
}

.mirror-searchable-select__menu {
  min-width: 10rem;
}

.mirror-searchable-select__search {
  padding: 0.45rem 0.5rem;
  border-bottom: 1px solid var(--n-border-color);
}

.mirror-searchable-select__options {
  padding: 0.25rem 0;
}

.mirror-searchable-select__group {
  padding: 0.35rem 0.75rem 0.2rem;
  color: var(--n-text-color-3);
  font-size: 0.72rem;
  font-weight: 600;
}

.mirror-searchable-select__option {
  display: block;
  width: 100%;
  padding: 0.45rem 0.75rem;
  border: none;
  background: transparent;
  color: var(--n-text-color);
  font: inherit;
  font-size: 0.84rem;
  text-align: left;
  cursor: pointer;
}

.mirror-searchable-select__option:hover:not(:disabled) {
  background: var(--n-option-color-pending);
}

.mirror-searchable-select__option--active {
  color: var(--n-option-text-color-active);
  background: var(--n-option-color-active);
}

.mirror-searchable-select__option:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
