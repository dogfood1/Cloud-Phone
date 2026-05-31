package com.yiyi.cloud_phone.cast;

import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.ScrollView;
import android.widget.TextView;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public final class CastStartupLog {
    private static final int MAX_LINES = 80;

    private final TextView textView;
    private final ScrollView scrollView;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final SimpleDateFormat timeFormat =
            new SimpleDateFormat("HH:mm:ss", Locale.getDefault());

    CastStartupLog(TextView textView, ScrollView scrollView) {
        this.textView = textView;
        this.scrollView = scrollView;
    }

    void reset(String placeholder) {
        Runnable task = () -> textView.setText(placeholder == null ? "" : placeholder);
        if (Looper.myLooper() == Looper.getMainLooper()) {
            task.run();
        } else {
            mainHandler.post(task);
        }
    }

    void clear() {
        reset("");
    }

    void append(String line) {
        if (line == null || line.isEmpty()) {
            return;
        }
        Runnable task = () -> {
            String timestamp = timeFormat.format(new Date());
            String entry = timestamp + "  " + line;
            CharSequence current = textView.getText();
            String placeholder = textView.getContext().getString(
                    com.yiyi.cloud_phone.R.string.cast_log_placeholder
            );
            String base = current.length() == 0 || placeholder.contentEquals(current)
                    ? ""
                    : current + "\n";
            String combined = base + entry;
            textView.setText(trimLines(combined));
            scrollView.post(() -> scrollView.fullScroll(View.FOCUS_DOWN));
        };
        if (Looper.myLooper() == Looper.getMainLooper()) {
            task.run();
        } else {
            mainHandler.post(task);
        }
    }

    private static String trimLines(String text) {
        String[] lines = text.split("\n");
        if (lines.length <= MAX_LINES) {
            return text;
        }
        StringBuilder builder = new StringBuilder();
        for (int index = lines.length - MAX_LINES; index < lines.length; index += 1) {
            if (builder.length() > 0) {
                builder.append('\n');
            }
            builder.append(lines[index]);
        }
        return builder.toString();
    }
}
