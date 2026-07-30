package com.yiyi.cloud_phone.multiapp;

import android.icu.util.ChineseCalendar;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

final class Win11CalendarLunar {
    static final class DayCell {
        final String key;
        final int day;
        final boolean outside;
        final boolean today;
        final String subLabel;

        DayCell(String key, int day, boolean outside, boolean today, String subLabel) {
            this.key = key;
            this.day = day;
            this.outside = outside;
            this.today = today;
            this.subLabel = subLabel;
        }
    }

    private static final String[] WEEKDAY_LABELS = {
            "星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"
    };
    private static final String[] WEEKDAY_SHORT = {"一", "二", "三", "四", "五", "六", "日"};
    private static final String[] LUNAR_MONTHS = {
            "正月", "二月", "三月", "四月", "五月", "六月",
            "七月", "八月", "九月", "十月", "冬月", "腊月"
    };
    private static final String[] LUNAR_DAYS = {
            "", "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
            "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
            "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"
    };
    private static final Map<String, String> SOLAR_TERMS_2026 = new HashMap<>();

    static {
        SOLAR_TERMS_2026.put("2026-01-05", "小寒");
        SOLAR_TERMS_2026.put("2026-01-20", "大寒");
        SOLAR_TERMS_2026.put("2026-02-04", "立春");
        SOLAR_TERMS_2026.put("2026-02-18", "雨水");
        SOLAR_TERMS_2026.put("2026-03-05", "惊蛰");
        SOLAR_TERMS_2026.put("2026-03-20", "春分");
        SOLAR_TERMS_2026.put("2026-04-04", "清明");
        SOLAR_TERMS_2026.put("2026-04-20", "谷雨");
        SOLAR_TERMS_2026.put("2026-05-05", "立夏");
        SOLAR_TERMS_2026.put("2026-05-21", "小满");
        SOLAR_TERMS_2026.put("2026-06-05", "芒种");
        SOLAR_TERMS_2026.put("2026-06-21", "夏至");
        SOLAR_TERMS_2026.put("2026-07-07", "小暑");
        SOLAR_TERMS_2026.put("2026-07-23", "大暑");
        SOLAR_TERMS_2026.put("2026-08-07", "立秋");
        SOLAR_TERMS_2026.put("2026-08-23", "处暑");
        SOLAR_TERMS_2026.put("2026-09-07", "白露");
        SOLAR_TERMS_2026.put("2026-09-23", "秋分");
        SOLAR_TERMS_2026.put("2026-10-08", "寒露");
        SOLAR_TERMS_2026.put("2026-10-23", "霜降");
        SOLAR_TERMS_2026.put("2026-11-07", "立冬");
        SOLAR_TERMS_2026.put("2026-11-22", "小雪");
        SOLAR_TERMS_2026.put("2026-12-07", "大雪");
        SOLAR_TERMS_2026.put("2026-12-22", "冬至");
    }

    private Win11CalendarLunar() {
    }

    static String[] weekdayShortLabels() {
        return WEEKDAY_SHORT.clone();
    }

    /** Match web: `7月30日, 星期四` */
    static String formatGregorianHeader(Calendar now) {
        int weekday = now.get(Calendar.DAY_OF_WEEK) - 1;
        return String.format(
                Locale.CHINA,
                "%d月%d日, %s",
                now.get(Calendar.MONTH) + 1,
                now.get(Calendar.DAY_OF_MONTH),
                WEEKDAY_LABELS[weekday]
        );
    }

    /** Match web: lunar month + day name, e.g. `六月十七` */
    static String formatLunarHeader(Calendar now) {
        LunarParts parts = lunarParts(now.getTime());
        return parts.monthName + parts.dayName;
    }

    static String formatMonthPickerLabel(Calendar viewDate) {
        return String.format(
                Locale.CHINA,
                "%d年%d月",
                viewDate.get(Calendar.YEAR),
                viewDate.get(Calendar.MONTH) + 1
        );
    }

    /** Match web taskbar: zh-CN `HH:mm:ss` */
    static String formatTaskbarTime(Calendar now) {
        return String.format(
                Locale.CHINA,
                "%02d:%02d:%02d",
                now.get(Calendar.HOUR_OF_DAY),
                now.get(Calendar.MINUTE),
                now.get(Calendar.SECOND)
        );
    }

    /** Match web taskbar: zh-CN `yyyy/M/d` */
    static String formatTaskbarDate(Calendar now) {
        return String.format(
                Locale.CHINA,
                "%d/%d/%d",
                now.get(Calendar.YEAR),
                now.get(Calendar.MONTH) + 1,
                now.get(Calendar.DAY_OF_MONTH)
        );
    }

    static List<DayCell> buildCalendarGrid(Calendar viewDate, Calendar today) {
        int year = viewDate.get(Calendar.YEAR);
        int month = viewDate.get(Calendar.MONTH);
        Calendar firstDay = Calendar.getInstance(Locale.CHINA);
        firstDay.clear();
        firstDay.set(year, month, 1);
        int startOffset = (firstDay.get(Calendar.DAY_OF_WEEK) + 5) % 7;
        Calendar gridStart = (Calendar) firstDay.clone();
        gridStart.add(Calendar.DAY_OF_MONTH, -startOffset);
        List<DayCell> cells = new ArrayList<>(42);
        for (int i = 0; i < 42; i++) {
            Calendar date = (Calendar) gridStart.clone();
            date.add(Calendar.DAY_OF_MONTH, i);
            cells.add(new DayCell(
                    formatDateKey(date),
                    date.get(Calendar.DAY_OF_MONTH),
                    date.get(Calendar.MONTH) != month,
                    isSameDay(date, today),
                    getCalendarSubLabel(date)
            ));
        }
        return cells;
    }

    private static String getCalendarSubLabel(Calendar date) {
        String term = SOLAR_TERMS_2026.get(formatDateKey(date));
        if (term != null) {
            return term;
        }
        LunarParts parts = lunarParts(date.getTime());
        if ("初一".equals(parts.dayName)) {
            return parts.monthName;
        }
        return parts.dayName;
    }

    private static LunarParts lunarParts(Date date) {
        ChineseCalendar cc = new ChineseCalendar();
        cc.setTime(date);
        int monthIndex = cc.get(ChineseCalendar.MONTH);
        int day = cc.get(ChineseCalendar.DAY_OF_MONTH);
        boolean leap = cc.get(ChineseCalendar.IS_LEAP_MONTH) == 1;
        String monthName;
        if (monthIndex >= 0 && monthIndex < LUNAR_MONTHS.length) {
            monthName = (leap ? "闰" : "") + LUNAR_MONTHS[monthIndex];
        } else {
            monthName = (leap ? "闰" : "") + (monthIndex + 1) + "月";
        }
        String dayName = day > 0 && day < LUNAR_DAYS.length ? LUNAR_DAYS[day] : String.valueOf(day);
        return new LunarParts(monthName, dayName);
    }

    private static String formatDateKey(Calendar date) {
        return String.format(
                Locale.US,
                "%04d-%02d-%02d",
                date.get(Calendar.YEAR),
                date.get(Calendar.MONTH) + 1,
                date.get(Calendar.DAY_OF_MONTH)
        );
    }

    private static boolean isSameDay(Calendar a, Calendar b) {
        return a.get(Calendar.YEAR) == b.get(Calendar.YEAR)
                && a.get(Calendar.MONTH) == b.get(Calendar.MONTH)
                && a.get(Calendar.DAY_OF_MONTH) == b.get(Calendar.DAY_OF_MONTH);
    }

    private static final class LunarParts {
        final String monthName;
        final String dayName;

        LunarParts(String monthName, String dayName) {
            this.monthName = monthName;
            this.dayName = dayName;
        }
    }
}
