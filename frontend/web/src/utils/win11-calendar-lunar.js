const SOLAR_TERMS_2026 = {
  "2026-01-05": "小寒",
  "2026-01-20": "大寒",
  "2026-02-04": "立春",
  "2026-02-18": "雨水",
  "2026-03-05": "惊蛰",
  "2026-03-20": "春分",
  "2026-04-04": "清明",
  "2026-04-20": "谷雨",
  "2026-05-05": "立夏",
  "2026-05-21": "小满",
  "2026-06-05": "芒种",
  "2026-06-21": "夏至",
  "2026-07-07": "小暑",
  "2026-07-23": "大暑",
  "2026-08-07": "立秋",
  "2026-08-23": "处暑",
  "2026-09-07": "白露",
  "2026-09-23": "秋分",
  "2026-10-08": "寒露",
  "2026-10-23": "霜降",
  "2026-11-07": "立冬",
  "2026-11-22": "小雪",
  "2026-12-07": "大雪",
  "2026-12-22": "冬至",
};

const WEEKDAY_LABELS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

const LUNAR_DAY_NAMES = [
  "",
  "初一",
  "初二",
  "初三",
  "初四",
  "初五",
  "初六",
  "初七",
  "初八",
  "初九",
  "初十",
  "十一",
  "十二",
  "十三",
  "十四",
  "十五",
  "十六",
  "十七",
  "十八",
  "十九",
  "二十",
  "廿一",
  "廿二",
  "廿三",
  "廿四",
  "廿五",
  "廿六",
  "廿七",
  "廿八",
  "廿九",
  "三十",
];

const lunarPartsFormatter = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
  month: "long",
  day: "numeric",
});

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getLunarParts(date) {
  const parts = lunarPartsFormatter.formatToParts(date);
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const dayRaw = parts.find((part) => part.type === "day")?.value ?? "1";
  const dayNumber = Number.parseInt(dayRaw.replace(/\D/g, ""), 10) || 1;
  return {
    month,
    dayNumber,
    dayName: LUNAR_DAY_NAMES[dayNumber] ?? `${dayNumber}`,
  };
}

export function formatGregorianHeader(date) {
  const weekday = WEEKDAY_LABELS[date.getDay()];
  return `${date.getMonth() + 1}月${date.getDate()}日, ${weekday}`;
}

export function formatLunarHeader(date) {
  const { month, dayName } = getLunarParts(date);
  return `${month}${dayName}`;
}

export function formatMonthPickerLabel(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

export function getCalendarSubLabel(date) {
  const solarTerm = SOLAR_TERMS_2026[formatDateKey(date)];
  if (solarTerm) {
    return solarTerm;
  }

  const { month, dayName } = getLunarParts(date);
  if (dayName === "初一") {
    return month;
  }

  return dayName;
}

export function buildCalendarGrid(viewDate, today = new Date()) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);
  const cells = [];

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    cells.push({
      key: formatDateKey(date),
      day: date.getDate(),
      outside: date.getMonth() !== month,
      isToday: isSameDay(date, today),
      subLabel: getCalendarSubLabel(date),
    });
  }

  return cells;
}
