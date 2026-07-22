<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { Icon } from "@iconify/vue";

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
const hasLoadedOnce = ref(false);

const weekdayLabels = ["一", "二", "三", "四", "五", "六", "日"];

const gregorianHeader = computed(() => formatGregorianHeader(props.now));
const lunarHeader = computed(() => formatLunarHeader(props.now));
const monthPickerLabel = computed(() => formatMonthPickerLabel(viewDate.value));
const calendarCells = computed(() => buildCalendarGrid(viewDate.value, props.now));
const hasNotifications = computed(() => notifications.value.length > 0);

let pollTimer = null;
let inFlight = false;
let pollGeneration = 0;

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
  () => [props.active, props.serial],
  ([isActive]) => {
    if (isActive && props.serial) {
      startPolling();
      return;
    }

    stopPolling();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  stopPolling();
});

function startPolling() {
  stopPolling();
  void loadNotifications({ initial: true });
  pollTimer = window.setInterval(() => {
    void loadNotifications({ initial: false });
  }, 1000);
}

function stopPolling() {
  if (pollTimer) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function loadNotifications({ initial = false } = {}) {
  if (!props.serial) {
    notifications.value = [];
    notificationsError.value = "";
    hasLoadedOnce.value = false;
    return;
  }

  if (inFlight) {
    return;
  }

  const generation = ++pollGeneration;
  inFlight = true;

  if (initial || !hasLoadedOnce.value) {
    notificationsLoading.value = true;
  }

  try {
    const rows = await fetchDeviceNotifications(props.serial, {
      light: hasLoadedOnce.value && !initial,
    });

    if (generation !== pollGeneration) {
      return;
    }

    notifications.value = mergeNotificationIcons(notifications.value, rows);
    notificationsError.value = "";
    hasLoadedOnce.value = true;
  } catch (error) {
    if (generation !== pollGeneration) {
      return;
    }

    if (!hasLoadedOnce.value) {
      notifications.value = [];
    }
    notificationsError.value = getErrorMessage(error) || "无法同步设备通知";
  } finally {
    if (generation === pollGeneration) {
      notificationsLoading.value = false;
    }
    inFlight = false;
  }
}

/**
 * Keep previously loaded icons when a light poll returns null icons.
 * @param {Array} previous
 * @param {Array} next
 */
function mergeNotificationIcons(previous, next) {
  const previousIcons = new Map(
    previous
      .filter((item) => item.iconDataUrl)
      .map((item) => [item.packageName, item.iconDataUrl]),
  );

  return next.map((item) => ({
    ...item,
    iconDataUrl: item.iconDataUrl || previousIcons.get(item.packageName) || null,
  }));
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
          @click="loadNotifications({ initial: true })"
        >
          <Icon icon="lucide:refresh-cw" :width="12" :height="12" />
        </button>
      </header>

      <div class="win11-date-flyout__notifications-body">
        <p v-if="notificationsLoading && !hasLoadedOnce" class="win11-date-flyout__notifications-status">
          正在同步设备通知…
        </p>
        <p v-else-if="notificationsError && !hasNotifications" class="win11-date-flyout__notifications-status is-error">
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
            <Icon icon="lucide:chevron-down" :width="12" :height="12" />
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
