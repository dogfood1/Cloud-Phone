package com.yiyi.cloud_phone.multiapp;

import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.GridLayout;
import android.widget.LinearLayout;
import android.widget.PopupWindow;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.yiyi.cloud_phone.CloudPhoneApiClient;
import com.yiyi.cloud_phone.R;
import com.yiyi.cloud_phone.settings.ServerEndpointStore;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.Executors;

public final class MultiAppClockPanelDialog {
    private MultiAppClockPanelDialog() {
    }

    public static void show(AppCompatActivity activity, View anchor, String serial) {
        View content = LayoutInflater.from(activity).inflate(R.layout.dialog_multi_app_clock_panel, null);
        TextView gregorian = content.findViewById(R.id.textCalendarGregorian);
        TextView lunar = content.findViewById(R.id.textCalendarLunar);
        TextView monthLabel = content.findViewById(R.id.textCalendarMonth);
        TextView notifError = content.findViewById(R.id.textNotificationsError);
        LinearLayout weekdays = content.findViewById(R.id.calendarWeekdays);
        GridLayout calendarGrid = content.findViewById(R.id.calendarGrid);
        RecyclerView recycler = content.findViewById(R.id.recyclerNotifications);
        MultiAppNotificationAdapter adapter = new MultiAppNotificationAdapter();
        recycler.setLayoutManager(new LinearLayoutManager(activity));
        recycler.setAdapter(adapter);

        int width = MultiAppFlyoutPopup.fitWidth(activity, 320);
        int maxH = MultiAppFlyoutPopup.maxHeightAbove(activity, anchor);
        adaptNotificationHeight(recycler, maxH);
        int dayH = maxH < MultiAppFlyoutPopup.dp(activity, 420)
                ? MultiAppFlyoutPopup.dp(activity, 32)
                : MultiAppFlyoutPopup.dp(activity, 36);

        Calendar now = Calendar.getInstance(Locale.CHINA);
        gregorian.setText(Win11CalendarLunar.formatGregorianHeader(now));
        lunar.setText(Win11CalendarLunar.formatLunarHeader(now));
        monthLabel.setText(Win11CalendarLunar.formatMonthPickerLabel(now));
        bindWeekdays(activity, weekdays);
        bindCalendarGrid(activity, calendarGrid, now, dayH);

        content.setLayoutParams(new ViewGroup.LayoutParams(width, ViewGroup.LayoutParams.WRAP_CONTENT));
        PopupWindow popup = MultiAppFlyoutPopup.showAboveEnd(activity, anchor, content, width, maxH);
        Handler handler = new Handler(Looper.getMainLooper());
        Runnable poll = () -> Executors.newSingleThreadExecutor().execute(() -> loadNotifications(
                activity, serial, adapter, notifError
        ));
        handler.post(poll);
        Runnable pollLoop = new Runnable() {
            @Override
            public void run() {
                if (!popup.isShowing()) {
                    return;
                }
                poll.run();
                handler.postDelayed(this, 1000L);
            }
        };
        handler.postDelayed(pollLoop, 1000L);
        popup.setOnDismissListener(() -> handler.removeCallbacks(pollLoop));
    }

    private static void adaptNotificationHeight(RecyclerView recycler, int maxH) {
        ViewGroup.LayoutParams lp = recycler.getLayoutParams();
        if (lp == null) {
            return;
        }
        float density = recycler.getResources().getDisplayMetrics().density;
        if (maxH < Math.round(360 * density)) {
            lp.height = Math.round(64 * density);
        } else if (maxH < Math.round(480 * density)) {
            lp.height = Math.round(88 * density);
        } else {
            lp.height = Math.round(112 * density);
        }
        recycler.setLayoutParams(lp);
    }

    private static void bindWeekdays(AppCompatActivity activity, LinearLayout row) {
        row.removeAllViews();
        for (String label : Win11CalendarLunar.weekdayShortLabels()) {
            TextView tv = new TextView(activity);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
            tv.setLayoutParams(lp);
            tv.setGravity(Gravity.CENTER);
            tv.setText(label);
            tv.setTextColor(0xFF666666);
            tv.setTextSize(10f);
            row.addView(tv);
        }
    }

    private static void bindCalendarGrid(
            AppCompatActivity activity,
            GridLayout grid,
            Calendar now,
            int dayHeight
    ) {
        grid.removeAllViews();
        List<Win11CalendarLunar.DayCell> cells = Win11CalendarLunar.buildCalendarGrid(now, now);
        for (Win11CalendarLunar.DayCell cell : cells) {
            View dayView = LayoutInflater.from(activity).inflate(R.layout.item_multi_app_calendar_day, grid, false);
            TextView num = dayView.findViewById(R.id.textCalendarDayNum);
            TextView sub = dayView.findViewById(R.id.textCalendarDaySub);
            num.setText(String.valueOf(cell.day));
            sub.setText(cell.subLabel);
            if (cell.today) {
                dayView.setBackgroundResource(R.drawable.bg_win11_calendar_today);
                num.setTextColor(0xFFFFFFFF);
                sub.setTextColor(0xEBFFFFFF);
            } else if (cell.outside) {
                num.setTextColor(0xFFB8B8B8);
                sub.setTextColor(0xFFB8B8B8);
            }
            GridLayout.LayoutParams lp = new GridLayout.LayoutParams();
            lp.width = 0;
            lp.height = dayHeight;
            lp.columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f);
            lp.rowSpec = GridLayout.spec(GridLayout.UNDEFINED);
            dayView.setLayoutParams(lp);
            grid.addView(dayView);
        }
    }

    private static void loadNotifications(
            AppCompatActivity activity,
            String serial,
            MultiAppNotificationAdapter adapter,
            TextView notifError
    ) {
        try {
            ServerEndpointStore.Endpoint store = ServerEndpointStore.read(activity);
            JSONObject result = CloudPhoneApiClient.getNotifications(activity, store.host, store.port, serial, true);
            JSONArray items = result.optJSONArray("notifications");
            List<MultiAppNotificationAdapter.Item> parsed = new ArrayList<>();
            if (items != null) {
                for (int i = 0; i < items.length(); i++) {
                    JSONObject item = items.optJSONObject(i);
                    if (item == null) {
                        continue;
                    }
                    parsed.add(new MultiAppNotificationAdapter.Item(
                            item.optString("title", ""),
                            item.optString("text", ""),
                            item.optString("appLabel", item.optString("packageName", "")),
                            item.optString("iconDataUrl", null)
                    ));
                }
            }
            activity.runOnUiThread(() -> {
                adapter.setItems(parsed);
                notifError.setText(parsed.isEmpty() ? activity.getString(R.string.multi_app_no_notifications) : "");
                notifError.setVisibility(parsed.isEmpty() ? View.VISIBLE : View.GONE);
            });
        } catch (Exception err) {
            activity.runOnUiThread(() -> {
                notifError.setVisibility(View.VISIBLE);
                notifError.setText(err.getMessage());
                notifError.setTextColor(0xFFC42B1C);
            });
        }
    }
}
