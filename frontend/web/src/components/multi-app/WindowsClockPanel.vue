<script setup>
import { computed, ref, watch } from "vue";

import Win11TaskbarIcon from "./Win11TaskbarIcon.vue";
import {
  buildCalendarGrid,
  formatGregorianHeader,
  formatLunarHeader,
  formatMonthPickerLabel,
} from "../../utils/win11-calendar-lunar.js";

const props = defineProps({
  now: {
    type: Date,
    required: true,
  },
});

const viewDate = ref(new Date(props.now));
const calendarExpanded = ref(true);

const weekdayLabels = ["一", "二", "三", "四", "五", "六", "日"];

const gregorianHeader = computed(() => formatGregorianHeader(props.now));
const lunarHeader = computed(() => formatLunarHeader(props.now));
const monthPickerLabel = computed(() => formatMonthPickerLabel(viewDate.value));
const calendarCells = computed(() => buildCalendarGrid(viewDate.value, props.now));

watch(
  () => props.now,
  (nextNow) => {
    if (
      viewDate.value.getFullYear() === nextNow.getFullYear() &&
      viewDate.value.getMonth() === nextNow.getMonth()
    ) {
      return;
    }

    viewDate.value = new Date(nextNow.getFullYear(), nextNow.getMonth(), 1);
  },
);

function toggleCalendarExpanded() {
  calendarExpanded.value = !calendarExpanded.value;
}
</script>

<template>
  <div class="win11-date-flyout">
    <section class="win11-date-flyout__panel win11-date-flyout__panel--notifications">
      <header class="win11-date-flyout__panel-head">
        <span class="win11-date-flyout__panel-title">通知</span>
      </header>
      <div class="win11-date-flyout__notifications-body" aria-hidden="true" />
    </section>

    <section class="win11-date-flyout__panel win11-date-flyout__panel--calendar">
      <div class="win11-date-flyout__calendar-summary">
        <div class="win11-date-flyout__calendar-date">
          <strong>{{ gregorianHeader }}</strong>
          <span>{{ lunarHeader }}</span>
        </div>
        <button
          type="button"
          class="win11-date-flyout__icon-btn"
          :aria-label="calendarExpanded ? '收起日历' : '展开日历'"
          @click="toggleCalendarExpanded"
        >
          <span class="win11-date-flyout__chevron" :class="{ 'is-collapsed': !calendarExpanded }">
            <Win11TaskbarIcon name="chevron-down" :size="12" />
          </span>
        </button>
      </div>

      <div v-show="calendarExpanded" class="win11-date-flyout__calendar-body">
        <div class="win11-date-flyout__month-row">
          <span>{{ monthPickerLabel }}</span>
        </div>

        <div class="win11-date-flyout__weekdays">
          <span v-for="label in weekdayLabels" :key="label">{{ label }}</span>
        </div>

        <div class="win11-date-flyout__grid">
          <div
            v-for="cell in calendarCells"
            :key="cell.key"
            class="win11-date-flyout__day"
            :class="{
              'is-outside': cell.outside,
              'is-today': cell.isToday,
            }"
          >
            <span class="win11-date-flyout__day-num">{{ cell.day }}</span>
            <span class="win11-date-flyout__day-sub">{{ cell.subLabel }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.win11-date-flyout__chevron {
  display: inline-flex;
  transition: transform 0.15s ease;
}

.win11-date-flyout__chevron.is-collapsed {
  transform: rotate(-90deg);
}
</style>
