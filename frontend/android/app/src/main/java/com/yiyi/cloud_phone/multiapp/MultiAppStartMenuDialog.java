package com.yiyi.cloud_phone.multiapp;

import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.PopupWindow;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.yiyi.cloud_phone.CloudPhoneApiClient;
import com.yiyi.cloud_phone.R;
import com.yiyi.cloud_phone.settings.ServerEndpointStore;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MultiAppStartMenuDialog {
    public static final class AppItem {
        public final String packageName;
        public final String label;
        public final String activity;
        public final String iconDataUrl;
        public final String orientation;

        public AppItem(String packageName, String label, String activity, String iconDataUrl, String orientation) {
            this.packageName = packageName;
            this.label = label;
            this.activity = activity;
            this.iconDataUrl = iconDataUrl;
            this.orientation = orientation;
        }
    }

    public interface LaunchListener {
        void onLaunch(AppItem item);
    }

    public interface FullscreenListener {
        void onToggleFullscreen();
    }

    private MultiAppStartMenuDialog() {
    }

    public static void show(
            AppCompatActivity activity,
            View anchor,
            String serial,
            LaunchListener listener,
            FullscreenListener fullscreenListener,
            boolean inFullscreen
    ) {
        View content = LayoutInflater.from(activity).inflate(R.layout.dialog_multi_app_start_menu, null);
        RecyclerView recycler = content.findViewById(R.id.recyclerStartMenuApps);
        EditText search = content.findViewById(R.id.editStartMenuSearch);
        TextView status = content.findViewById(R.id.textStartMenuStatus);
        TextView fullscreenText = content.findViewById(R.id.textStartMenuFullscreen);
        ImageView fullscreenIcon = content.findViewById(R.id.imageStartMenuFullscreen);
        MultiAppStartMenuAdapter adapter = new MultiAppStartMenuAdapter();
        recycler.setAdapter(adapter);
        List<AppItem> allApps = new ArrayList<>();
        status.setVisibility(View.VISIBLE);
        status.setText("正在加载应用…");
        recycler.setVisibility(View.GONE);

        int width = Math.min(
                MultiAppFlyoutPopup.dp(activity, 672),
                Math.round(activity.getResources().getDisplayMetrics().widthPixels * 0.72f)
        );
        int maxHeight = Math.min(
                MultiAppFlyoutPopup.dp(activity, 544),
                Math.round(activity.getResources().getDisplayMetrics().heightPixels * 0.70f)
        );
        content.setLayoutParams(new android.view.ViewGroup.LayoutParams(width, maxHeight));
        PopupWindow popup = MultiAppFlyoutPopup.showAbove(activity, anchor, content, width, maxHeight);

        adapter.setOnAppClickListener(item -> {
            popup.dismiss();
            listener.onLaunch(item);
        });

        ExecutorService executor = Executors.newSingleThreadExecutor();
        executor.execute(() -> {
            try {
                ServerEndpointStore.Endpoint store = ServerEndpointStore.read(activity);
                JSONObject result = CloudPhoneApiClient.listLauncherApps(
                        activity, store.host, store.port, serial, false, false
                );
                JSONArray apps = result.optJSONArray("apps");
                List<AppItem> parsed = new ArrayList<>();
                if (apps != null) {
                    for (int i = 0; i < apps.length(); i++) {
                        JSONObject app = apps.optJSONObject(i);
                        if (app == null) {
                            continue;
                        }
                        String pkg = app.optString("packageName", "");
                        if (pkg.isEmpty()) {
                            continue;
                        }
                        parsed.add(new AppItem(
                                pkg,
                                app.optString("label", pkg),
                                app.optString("activity", ""),
                                app.optString("iconDataUrl", null),
                                "portrait"
                        ));
                    }
                }
                activity.runOnUiThread(() -> {
                    allApps.clear();
                    allApps.addAll(parsed);
                    applyList(recycler, adapter, status, allApps, "");
                });
            } catch (Exception error) {
                activity.runOnUiThread(() -> {
                    status.setVisibility(View.VISIBLE);
                    status.setText(error.getMessage() == null ? "加载失败" : error.getMessage());
                    status.setTextColor(0xFFC42B1C);
                    recycler.setVisibility(View.GONE);
                    Toast.makeText(activity, error.getMessage(), Toast.LENGTH_SHORT).show();
                });
            } finally {
                executor.shutdown();
            }
        });

        search.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {
            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                String q = s == null ? "" : s.toString().trim().toLowerCase(Locale.ROOT);
                applyList(recycler, adapter, status, allApps, q);
            }

            @Override
            public void afterTextChanged(Editable s) {
            }
        });

        fullscreenText.setText(inFullscreen
                ? R.string.multi_app_exit_fullscreen
                : R.string.multi_app_toggle_fullscreen);
        fullscreenIcon.setImageResource(inFullscreen
                ? R.drawable.ic_win11_exit_fullscreen
                : R.drawable.ic_win11_fullscreen);
        content.findViewById(R.id.buttonStartMenuFullscreen).setOnClickListener(v -> {
            popup.dismiss();
            if (fullscreenListener != null) {
                fullscreenListener.onToggleFullscreen();
            }
        });
    }

    private static void applyList(
            RecyclerView recycler,
            MultiAppStartMenuAdapter adapter,
            TextView status,
            List<AppItem> allApps,
            String query
    ) {
        List<AppItem> shown = new ArrayList<>();
        if (query.isEmpty()) {
            shown.addAll(allApps);
            recycler.setLayoutManager(new GridLayoutManager(recycler.getContext(), 6));
        } else {
            for (AppItem item : allApps) {
                if (item.label.toLowerCase(Locale.ROOT).contains(query)
                        || item.packageName.toLowerCase(Locale.ROOT).contains(query)) {
                    shown.add(item);
                }
            }
            recycler.setLayoutManager(new LinearLayoutManager(recycler.getContext()));
        }
        adapter.setItems(shown);
        if (shown.isEmpty()) {
            status.setVisibility(View.VISIBLE);
            status.setTextColor(0xFF666666);
            status.setText(query.isEmpty() ? "暂无应用" : "无匹配应用");
            recycler.setVisibility(View.GONE);
        } else {
            status.setVisibility(View.GONE);
            recycler.setVisibility(View.VISIBLE);
        }
    }
}
