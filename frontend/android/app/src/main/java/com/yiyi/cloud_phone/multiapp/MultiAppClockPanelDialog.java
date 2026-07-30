package com.yiyi.cloud_phone.multiapp;

import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
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
        RecyclerView recycler = content.findViewById(R.id.recyclerNotifications);
        MultiAppNotificationAdapter adapter = new MultiAppNotificationAdapter();
        recycler.setLayoutManager(new LinearLayoutManager(activity));
        recycler.setAdapter(adapter);
        Calendar now = Calendar.getInstance();
        gregorian.setText(Win11CalendarLunar.formatGregorianHeader(now));
        lunar.setText(Win11CalendarLunar.formatLunarHeader(now));
        monthLabel.setText(Win11CalendarLunar.formatMonthPickerLabel(now));

        int width = MultiAppFlyoutPopup.dp(activity, 360);
        PopupWindow popup = MultiAppFlyoutPopup.showAboveEnd(activity, anchor, content, width, 0);
        Handler handler = new Handler(Looper.getMainLooper());
        Runnable poll = () -> Executors.newSingleThreadExecutor().execute(() -> {
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
        });
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
}
