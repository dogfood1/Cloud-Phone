<script setup>
import { computed, onMounted, ref, watch } from "vue";

import Win11TaskbarIcon from "./Win11TaskbarIcon.vue";
import {
  buildCalendarGrid,
  formatGregorianHeader,
  formatLunarHeader,
  formatMonthPickerLabel,
} from "../../utils/win11-calendar-lunar.js";
import { fetchDeviceNotifications } from "../../utils/device-notifications-api.js";
import { getErrorMessage } from "../../utils/api.js";

const props = defineProps({
  now: {
    type: Date,
    required: true,
  },
  serial: {
    type: String,
    default: "",
  },
  active: {
    type: Boolean,
    default: false,
  },
});

const viewDate = ref(new Date(props.now));
const calendarExpanded = ref(true);
const notifications = ref([]);
const notificationsLoading = ref(false);
const notificationsError = ref("");

const weekdayLabels = ["一", "二", "三", "四", "五", "六", "日"];

const gregorianHeader = computed(() => formatGregorianHeader(props.now));
const lunarHeader = computed(() => formatLunarHeader(props.now));
const monthPickerLabel = computed(() => formatMonthPickerLabel(viewDate.value));
const calendarCells = computed(() => buildCalendarGrid(viewDate.value, props.now));
const hasNotifications = computed(() => notifications.value.length > 0);

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

watch(
  () => props.serial,
  () => {
    void loadNotifications();
  },
);

watch(
  () => props.active,
  (isActive) => {
    if (isActive) {
      void loadNotifications();
    }
  },
);

onMounted(() => {
  void loadNotifications();
});

async function loadNotifications() {
  if (!props.serial) {
    notifications.value = [];
    notificationsError.value = "";
    return;
  }

  notificationsLoading.value = true;
  notificationsError.value = "";

  try {
    notifications.value = await fetchDeviceNotifications(props.serial);
  } catch (error) {
    notifications.value = [];
    notificationsError.value = getErrorMessage(error) || "无法同步设备通知";
  } finally {
    notificationsLoading.value = false;
  }
}

function toggleCalendarExpanded() {
  calendarExpanded.value = !calendarExpanded.value;
}

function formatPostTime(postTime) {
  if (!postTime) {
    return "";
  }

  return new Date(postTime).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function initialsFor(item) {
  const source = item.appLabel || item.title || item.packageName || "?";
  return String(source).trim().slice(0, 1).toUpperCase();
}
</script>

<template>
  <div class="win11-date-flyout">
    <section class="win11-date-flyout__panel win11-date-flyout__panel--notifications">
      <header class="win11-date-flyout__panel-head">
        <span class="win11-date-flyout__panel-title">通知</span>
        <button
          type="button"
          class="win11-date-flyout__icon-btn"
          aria-label="刷新通知"
          :disabled="notificationsLoading || !serial"
          @click="loadNotifications"
        >
          <Win11TaskbarIcon name="refresh" :size="12" />
        </button>
      </header>

      <div class="win11-date-flyout__notifications-body">
        <p v-if="notificationsLoading" class="win11-date-flyout__notifications-status">
          正在同步设备通知…
        </p>
        <p v-else-if="notificationsError" class="win11-date-flyout__notifications-status is-error">
          {{ notificationsError }}
        </p>
        <p v-else-if="!hasNotifications" class="win11-date-flyout__notifications-status">
          没有新通知
        </p>
        <ul v-else class="win11-date-flyout__notification-list">
          <li v-for="item in notifications" :key="item.id" class="win11-date-flyout__notification">
            <div class="win11-date-flyout__notification-icon" aria-hidden="true">
              <img v-if="item.iconDataUrl" :src="item.iconDataUrl" alt="" />
              <span v-else>{{ initialsFor(item) }}</span>
            </div>
            <div class="win11-date-flyout__notification-main">
              <div class="win11-date-flyout__notification-top">
                <strong>{{ item.title }}</strong>
                <time v-if="item.postTime">{{ formatPostTime(item.postTime) }}</time>
              </div>
              <p v-if="item.text">{{ item.text }}</p>
              <span class="win11-date-flyout__notification-app">{{ item.appLabel }}</span>
            </div>
          </li>
        </ul>
      </div>
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
