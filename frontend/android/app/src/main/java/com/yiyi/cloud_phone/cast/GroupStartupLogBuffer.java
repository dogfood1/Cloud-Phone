package com.yiyi.cloud_phone.cast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

final class GroupStartupLogBuffer {
    private static final int MAX_LINES = 80;
    private static final String PLACEHOLDER = "等待连接日志…";

    private final List<String> lines = new ArrayList<>();
    private final SimpleDateFormat timeFormat =
            new SimpleDateFormat("HH:mm:ss", Locale.CHINA);

    void reset() {
        lines.clear();
        lines.add(PLACEHOLDER);
    }

    void append(String message) {
        if (message == null || message.trim().isEmpty()) {
            return;
        }
        if (lines.size() == 1 && PLACEHOLDER.equals(lines.get(0))) {
            lines.clear();
        }
        lines.add(timeFormat.format(new Date()) + "  " + message.trim());
        while (lines.size() > MAX_LINES) {
            lines.remove(0);
        }
    }

    int ingest(JSONArray entries, int fromIndex) {
        if (entries == null) {
            return fromIndex;
        }
        int consumed = fromIndex;
        for (int i = fromIndex; i < entries.length(); i++) {
            Object entry = entries.opt(i);
            String message = null;
            if (entry instanceof String) {
                message = (String) entry;
            } else if (entry instanceof JSONObject) {
                message = ((JSONObject) entry).optString("message", "");
            }
            if (message != null && !message.isEmpty()) {
                append(message);
            }
            consumed = i + 1;
        }
        return consumed;
    }

    String text() {
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < lines.size(); i++) {
            if (i > 0) {
                builder.append('\n');
            }
            builder.append(lines.get(i));
        }
        return builder.toString();
    }
}
