package com.yiyi.cloud_phone.multiapp;

import android.util.TypedValue;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.HorizontalScrollView;
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
    private View taskbarRoot;
    private LinearLayout taskbarCenter;
    private LinearLayout taskbarWindows;
    private LinearLayout taskbarTray;
    private HorizontalScrollView appsScroll;
    private TextView clockTime;
    private TextView clockDate;
    private ImageView trayWifi;
    private ImageView trayVolume;
    private View startBtn;
    private View qsBtn;
    private View clockBtn;
    private final Runnable layoutPass = this::applyResponsiveLayout;

    MultiAppTaskbarController(AppCompatActivity activity, Host host) {
        this.activity = activity;
        this.host = host;
    }

    void bind(View root) {
        taskbarRoot = root;
        taskbarCenter = root.findViewById(R.id.taskbarCenter);
        taskbarWindows = root.findViewById(R.id.taskbarWindows);
        taskbarTray = root.findViewById(R.id.taskbarTray);
        appsScroll = root.findViewById(R.id.taskbarAppsScroll);
        clockTime = root.findViewById(R.id.textTaskbarClockTime);
        clockDate = root.findViewById(R.id.textTaskbarClockDate);
        trayWifi = root.findViewById(R.id.imageTrayWifi);
        trayVolume = root.findViewById(R.id.imageTrayVolume);
        startBtn = root.findViewById(R.id.buttonTaskbarStart);
        qsBtn = root.findViewById(R.id.buttonQuickSettings);
        clockBtn = root.findViewById(R.id.buttonTaskbarClock);
        startBtn.setOnClickListener(v -> host.onStartMenu(startBtn));
        qsBtn.setOnClickListener(v -> host.onQuickSettings(qsBtn));
        clockBtn.setOnClickListener(v -> host.onClockPanel(clockBtn));
        root.addOnLayoutChangeListener((v, l, t, r, b, ol, ot, or, ob) -> {
            if (r - l != or - ol) {
                scheduleLayoutPass();
            }
        });
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
            lp.setMarginEnd(dp(2));
            taskbarWindows.addView(chip, lp);
        }
        scheduleLayoutPass();
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

    private void scheduleLayoutPass() {
        if (taskbarRoot == null) {
            return;
        }
        taskbarRoot.removeCallbacks(layoutPass);
        taskbarRoot.post(layoutPass);
    }

    private void applyResponsiveLayout() {
        if (taskbarRoot == null || taskbarCenter == null || taskbarTray == null || taskbarWindows == null) {
            return;
        }
        int trayW = Math.max(taskbarTray.getWidth(), taskbarTray.getMeasuredWidth());
        if (trayW <= 0) {
            taskbarTray.measure(
                    View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED),
                    View.MeasureSpec.makeMeasureSpec(taskbarRoot.getHeight(), View.MeasureSpec.EXACTLY)
            );
            trayW = taskbarTray.getMeasuredWidth();
        }
        // Symmetric inset so Start+apps stay centered and never draw under the tray.
        int inset = trayW + dp(4);
        taskbarCenter.setPaddingRelative(inset, 0, inset, 0);

        setLabelsVisible(true);
        int availableApps = availableAppsWidth();
        int fullApps = measureAppsWidth();
        boolean iconOnly = fullApps > availableApps && taskbarWindows.getChildCount() > 0;
        setLabelsVisible(!iconOnly);
        if (appsScroll != null) {
            int maxScroll = Math.max(0, availableApps);
            ViewGroup.LayoutParams lp = appsScroll.getLayoutParams();
            if (lp instanceof LinearLayout.LayoutParams) {
                // Cap scroll viewport so chips can scroll instead of pushing Start off-screen.
                int needed = measureAppsWidth();
                lp.width = needed <= maxScroll ? ViewGroup.LayoutParams.WRAP_CONTENT : maxScroll;
                appsScroll.setLayoutParams(lp);
            }
        }
    }

    private int availableAppsWidth() {
        int centerInner = taskbarCenter.getWidth()
                - taskbarCenter.getPaddingStart()
                - taskbarCenter.getPaddingEnd();
        int startW = startBtn != null ? startBtn.getWidth() : 0;
        return Math.max(0, centerInner - startW - dp(4));
    }

    private int measureAppsWidth() {
        taskbarWindows.measure(
                View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED),
                View.MeasureSpec.makeMeasureSpec(
                        Math.max(1, taskbarWindows.getHeight()),
                        View.MeasureSpec.EXACTLY
                )
        );
        return taskbarWindows.getMeasuredWidth();
    }

    private void setLabelsVisible(boolean visible) {
        int labelVis = visible ? View.VISIBLE : View.GONE;
        int endPad = visible ? dp(8) : dp(6);
        for (int i = 0; i < taskbarWindows.getChildCount(); i++) {
            View chip = taskbarWindows.getChildAt(i);
            TextView label = chip.findViewById(R.id.textTaskbarAppLabel);
            if (label != null) {
                label.setVisibility(labelVis);
            }
            chip.setPaddingRelative(dp(6), chip.getPaddingTop(), endPad, chip.getPaddingBottom());
        }
    }

    private int dp(int value) {
        return Math.round(TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                value,
                activity.getResources().getDisplayMetrics()
        ));
    }
}
