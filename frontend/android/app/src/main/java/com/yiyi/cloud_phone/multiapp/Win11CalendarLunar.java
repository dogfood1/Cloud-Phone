package com.yiyi.cloud_phone.multiapp;

import java.util.Calendar;
import java.util.Locale;

final class Win11CalendarLunar {
    private Win11CalendarLunar() {
    }

    static String formatGregorianHeader(Calendar now) {
        return String.format(
                Locale.CHINA,
                "%d年%d月%d日 %s",
                now.get(Calendar.YEAR),
                now.get(Calendar.MONTH) + 1,
                now.get(Calendar.DAY_OF_MONTH),
                weekdayLabel(now)
        );
    }

    static String formatLunarHeader(Calendar now) {
        java.text.SimpleDateFormat fmt = new java.text.SimpleDateFormat("MMMMdd", Locale.CHINA);
        fmt.setCalendar(new java.util.GregorianCalendar(Locale.CHINA));
        try {
            fmt.setCalendar(java.util.Calendar.getInstance(Locale.CHINA));
            java.util.Calendar lunar = Calendar.getInstance(Locale.CHINA);
            lunar.setTime(now.getTime());
            return fmt.format(lunar.getTime());
        } catch (Exception ignored) {
            return "";
        }
    }

    static String formatMonthPickerLabel(Calendar viewDate) {
        return String.format(Locale.CHINA, "%d年%d月", viewDate.get(Calendar.YEAR), viewDate.get(Calendar.MONTH) + 1);
    }

    private static String weekdayLabel(Calendar date) {
        String[] labels = { "星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六" };
        int idx = date.get(Calendar.DAY_OF_WEEK) - 1;
        return labels[idx];
    }
}
