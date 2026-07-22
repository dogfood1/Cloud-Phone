<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  now: {
    type: Date,
    required: true,
  },
});

const viewDate = ref(new Date(props.now));

const monthLabel = computed(() =>
  viewDate.value.toLocaleDateString("zh-CN", { year: "numeric", month: "long" }),
);

const weekdayLabels = ["一", "二", "三", "四", "五", "六", "日"];

const calendarCells = computed(() => {
  const year = viewDate.value.getFullYear();
  const month = viewDate.value.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push({ day: "", muted: true, today: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const isToday =
      day === props.now.getDate() &&
      month === props.now.getMonth() &&
      year === props.now.getFullYear();
    cells.push({ day, muted: false, today: isToday });
  }

  return cells;
});

function shiftMonth(delta) {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + delta, 1);
}
</script>

<template>
  <div class="win11-notification-center">
    <div class="win11-notification-center__empty">没有新通知</div>

    <div class="win11-notification-center__calendar">
      <div class="win11-notification-center__calendar-head">
        <button type="button" aria-label="上个月" @click="shiftMonth(-1)">‹</button>
        <strong>{{ monthLabel }}</strong>
        <button type="button" aria-label="下个月" @click="shiftMonth(1)">›</button>
      </div>

      <div class="win11-notification-center__weekdays">
        <span v-for="label in weekdayLabels" :key="label">{{ label }}</span>
      </div>

      <div class="win11-notification-center__grid">
        <span
          v-for="(cell, index) in calendarCells"
          :key="`${cell.day}-${index}`"
          class="win11-notification-center__day"
          :class="{
            'is-muted': cell.muted,
            'is-today': cell.today,
          }"
        >
          {{ cell.day }}
        </span>
      </div>
    </div>
  </div>
</template>
