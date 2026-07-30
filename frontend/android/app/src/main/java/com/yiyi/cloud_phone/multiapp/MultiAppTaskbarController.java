package com.yiyi.cloud_phone.multiapp;

import android.view.LayoutInflater;
import android.view.View;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.yiyi.cloud_phone.R;

final class MultiAppTaskbarController {
    interface Host {
        void onStartMenu(View anchor);

        void onFocusWindow(String id);

        void onQuickSettings(View anchor);

        void onClockPanel(View anchor);
    }

    private final AppCompatActivity activity;
    private final Host host;
    private LinearLayout taskbarWindows;
    private TextView clockTime;
    private TextView clockDate;
    private ImageView trayWifi;
    private ImageView trayVolume;
    private View startBtn;
    private View qsBtn;
    private View clockBtn;

    MultiAppTaskbarController(AppCompatActivity activity, Host host) {
        this.activity = activity;
        this.host = host;
    }

    void bind(View taskbarRoot) {
        taskbarWindows = taskbarRoot.findViewById(R.id.taskbarWindows);
        clockTime = taskbarRoot.findViewById(R.id.textTaskbarClockTime);
        clockDate = taskbarRoot.findViewById(R.id.textTaskbarClockDate);
        trayWifi = taskbarRoot.findViewById(R.id.imageTrayWifi);
        trayVolume = taskbarRoot.findViewById(R.id.imageTrayVolume);
        startBtn = taskbarRoot.findViewById(R.id.buttonTaskbarStart);
        qsBtn = taskbarRoot.findViewById(R.id.buttonQuickSettings);
        clockBtn = taskbarRoot.findViewById(R.id.buttonTaskbarClock);
        startBtn.setOnClickListener(v -> host.onStartMenu(startBtn));
        qsBtn.setOnClickListener(v -> host.onQuickSettings(qsBtn));
        clockBtn.setOnClickListener(v -> host.onClockPanel(clockBtn));
    }

    void rebuild(MultiAppWindowManager windowManager) {
        if (taskbarWindows == null) {
            return;
        }
        taskbarWindows.removeAllViews();
        String focused = windowManager.focusedId();
        for (MultiAppWindowState win : windowManager.windows()) {
            View chip = LayoutInflater.from(activity).inflate(R.layout.item_multi_app_taskbar_app, taskbarWindows, false);
            TextView initial = chip.findViewById(R.id.textTaskbarAppInitial);
            ImageView icon = chip.findViewById(R.id.imageTaskbarAppIcon);
            TextView label = chip.findViewById(R.id.textTaskbarAppLabel);
            label.setText(win.label);
            MultiAppIconUtil.bindIcon(icon, initial, win.label, win.iconDataUrl);
            boolean active = win.id.equals(focused) && !win.minimized;
            chip.setAlpha(win.minimized ? 0.72f : 1f);
            chip.setBackgroundResource(active ? R.drawable.bg_taskbar_app_active : R.drawable.bg_taskbar_app_idle);
            chip.setOnClickListener(v -> host.onFocusWindow(win.id));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
            );
            lp.setMarginEnd(2);
            taskbarWindows.addView(chip, lp);
        }
    }

    void updateClock() {
        java.util.Calendar now = java.util.Calendar.getInstance(java.util.Locale.CHINA);
        if (clockTime != null) {
            clockTime.setText(Win11CalendarLunar.formatTaskbarTime(now));
        }
        if (clockDate != null) {
            clockDate.setText(Win11CalendarLunar.formatTaskbarDate(now));
        }
    }

    void updateTrayIcons(boolean wifiEnabled, boolean volumeMuted) {
        if (trayWifi != null) {
            trayWifi.setImageResource(wifiEnabled ? R.drawable.ic_win11_wifi : R.drawable.ic_win11_wifi_off);
        }
        if (trayVolume != null) {
            trayVolume.setImageResource(volumeMuted ? R.drawable.ic_win11_volume_mute : R.drawable.ic_win11_volume);
        }
    }
}
