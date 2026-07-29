package com.yiyi.cloud_phone.logs;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

public class AppEventLogger {
    public static final String LEVEL_DEBUG = "debug";
    public static final String LEVEL_INFO = "info";
    public static final String LEVEL_WARN = "warn";
    public static final String LEVEL_ERROR = "error";

    private static final int MAX_ENTRIES = 2000;
    private static final SimpleDateFormat TIME_FMT = new SimpleDateFormat("HH:mm:ss", Locale.getDefault());
    private static final AtomicLong idCounter = new AtomicLong(1);
    private static final AppEventLogger INSTANCE = new AppEventLogger();

    private final CopyOnWriteArrayList<LogEntry> entries = new CopyOnWriteArrayList<>();
    private OnLogChangedListener listener;

    private AppEventLogger() {
    }

    public static AppEventLogger get() {
        return INSTANCE;
    }

    public interface OnLogChangedListener {
        void onLogChanged();
    }

    public void setOnLogChangedListener(OnLogChangedListener l) {
        this.listener = l;
    }

    public void log(String level, String category, String event, String message) {
        log(level, category, event, message, null, null);
    }

    public void log(String level, String category, String event, String message, String deviceSerial, String deviceName) {
        LogEntry entry = new LogEntry(
                idCounter.getAndIncrement(),
                System.currentTimeMillis(),
                TIME_FMT.format(new Date()),
                level, category, event, message, deviceSerial, deviceName
        );
        entries.add(entry);
        while (entries.size() > MAX_ENTRIES) entries.remove(0);
        notifyChanged();
    }

    public void debug(String category, String event, String message) {
        log(LEVEL_DEBUG, category, event, message);
    }

    public void info(String category, String event, String message) {
        log(LEVEL_INFO, category, event, message);
    }

    public void warn(String category, String event, String message) {
        log(LEVEL_WARN, category, event, message);
    }

    public void error(String category, String event, String message) {
        log(LEVEL_ERROR, category, event, message);
    }

    public List<LogEntry> getEntries() {
        List<LogEntry> copy = new ArrayList<>(entries);
        Collections.reverse(copy);
        return copy;
    }

    public void clear() {
        entries.clear();
        notifyChanged();
    }

    private void notifyChanged() {
        if (listener != null) {
            listener.onLogChanged();
        }
    }
}
