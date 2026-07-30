package com.yiyi.cloud_phone.multiapp;

import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.PopupWindow;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.yiyi.cloud_phone.CloudPhoneApiClient;
import com.yiyi.cloud_phone.R;
import com.yiyi.cloud_phone.settings.ServerEndpointStore;

import org.json.JSONObject;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public final class MultiAppQuickSettingsDialog {
    public interface TrayListener {
        void onTrayStatus(boolean wifiEnabled, boolean volumeMuted);
    }

    private MultiAppQuickSettingsDialog() {
    }

    public static void show(AppCompatActivity activity, View anchor, String serial, TrayListener listener) {
        View content = LayoutInflater.from(activity).inflate(R.layout.dialog_multi_app_quick_settings, null);
        View tileWifi = content.findViewById(R.id.tileWifi);
        View tileBluetooth = content.findViewById(R.id.tileBluetooth);
        View tileAirplane = content.findViewById(R.id.tileAirplane);
        ImageView imageWifi = content.findViewById(R.id.imageTileWifi);
        TextView wifiSub = content.findViewById(R.id.textTileWifiSub);
        TextView btSub = content.findViewById(R.id.textTileBluetoothSub);
        TextView airSub = content.findViewById(R.id.textTileAirplaneSub);
        SeekBar volumeBar = content.findViewById(R.id.seekVolume);
        SeekBar brightnessBar = content.findViewById(R.id.seekBrightness);
        TextView volumeValue = content.findViewById(R.id.textVolumeValue);
        TextView brightnessValue = content.findViewById(R.id.textBrightnessValue);
        ImageButton muteBtn = content.findViewById(R.id.buttonMute);
        TextView error = content.findViewById(R.id.textQuickSettingsError);
        AtomicBoolean wifiOn = new AtomicBoolean(false);
        AtomicBoolean btOn = new AtomicBoolean(false);
        AtomicBoolean airOn = new AtomicBoolean(false);
        AtomicBoolean muted = new AtomicBoolean(false);
        Handler handler = new Handler(Looper.getMainLooper());
        ExecutorService executor = Executors.newSingleThreadExecutor();
        int width = MultiAppFlyoutPopup.dp(activity, 360);
        PopupWindow popup = MultiAppFlyoutPopup.showAboveEnd(activity, anchor, content, width, 0);

        Runnable refreshUi = () -> executor.execute(() -> refresh(
                activity, serial, tileWifi, tileBluetooth, tileAirplane, imageWifi,
                wifiSub, btSub, airSub, volumeBar, brightnessBar, volumeValue, brightnessValue,
                muteBtn, error, listener, wifiOn, btOn, airOn, muted
        ));
        handler.post(refreshUi);
        Runnable pollLoop = new Runnable() {
            @Override
            public void run() {
                if (!popup.isShowing()) {
                    return;
                }
                refreshUi.run();
                handler.postDelayed(this, 1000L);
            }
        };
        handler.postDelayed(pollLoop, 1000L);
        popup.setOnDismissListener(() -> {
            handler.removeCallbacks(pollLoop);
            executor.shutdownNow();
        });

        tileWifi.setOnClickListener(v -> patch(activity, serial, patchToggle("wifi", !wifiOn.get()), refreshUi));
        tileBluetooth.setOnClickListener(v -> patch(activity, serial, patchToggle("bluetooth", !btOn.get()), refreshUi));
        tileAirplane.setOnClickListener(v -> patch(activity, serial, patchToggle("airplane", !airOn.get()), refreshUi));
        muteBtn.setOnClickListener(v -> {
            JSONObject patch = new JSONObject();
            try {
                patch.put("volume", new JSONObject().put("muted", !muted.get()));
            } catch (Exception ignored) {
            }
            patch(activity, serial, patch, refreshUi);
        });
        volumeBar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
                if (fromUser) {
                    volumeValue.setText(String.valueOf(progress));
                }
            }

            @Override
            public void onStartTrackingTouch(SeekBar seekBar) {
            }

            @Override
            public void onStopTrackingTouch(SeekBar seekBar) {
                volumeValue.setText(String.valueOf(seekBar.getProgress()));
                JSONObject patch = new JSONObject();
                try {
                    patch.put("volume", new JSONObject().put("level", seekBar.getProgress()));
                } catch (Exception ignored) {
                }
                patch(activity, serial, patch, refreshUi);
            }
        });
        brightnessBar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
                if (fromUser) {
                    brightnessValue.setText(String.valueOf(progress));
                }
            }

            @Override
            public void onStartTrackingTouch(SeekBar seekBar) {
            }

            @Override
            public void onStopTrackingTouch(SeekBar seekBar) {
                brightnessValue.setText(String.valueOf(seekBar.getProgress()));
                JSONObject patch = new JSONObject();
                try {
                    patch.put("brightness", new JSONObject().put("level", seekBar.getProgress()));
                } catch (Exception ignored) {
                }
                patch(activity, serial, patch, refreshUi);
            }
        });
    }

    private static JSONObject patchToggle(String key, boolean enabled) {
        JSONObject patch = new JSONObject();
        try {
            patch.put(key, new JSONObject().put("enabled", enabled));
        } catch (Exception ignored) {
        }
        return patch;
    }

    private static void patch(AppCompatActivity activity, String serial, JSONObject patch, Runnable refresh) {
        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                ServerEndpointStore.Endpoint store = ServerEndpointStore.read(activity);
                CloudPhoneApiClient.patchQuickSettings(activity, store.host, store.port, serial, patch);
                activity.runOnUiThread(refresh);
            } catch (Exception error) {
                activity.runOnUiThread(() -> Toast.makeText(activity, error.getMessage(), Toast.LENGTH_SHORT).show());
            }
        });
    }

    private static void refresh(
            AppCompatActivity activity,
            String serial,
            View tileWifi,
            View tileBluetooth,
            View tileAirplane,
            ImageView imageWifi,
            TextView wifiSub,
            TextView btSub,
            TextView airSub,
            SeekBar volumeBar,
            SeekBar brightnessBar,
            TextView volumeValue,
            TextView brightnessValue,
            ImageButton muteBtn,
            TextView error,
            TrayListener listener,
            AtomicBoolean wifiOn,
            AtomicBoolean btOn,
            AtomicBoolean airOn,
            AtomicBoolean muted
    ) {
        try {
            ServerEndpointStore.Endpoint store = ServerEndpointStore.read(activity);
            JSONObject result = CloudPhoneApiClient.getQuickSettings(activity, store.host, store.port, serial);
            JSONObject settings = result.optJSONObject("settings");
            if (settings == null) {
                return;
            }
            JSONObject wifiObj = settings.optJSONObject("wifi");
            JSONObject btObj = settings.optJSONObject("bluetooth");
            JSONObject airplaneObj = settings.optJSONObject("airplane");
            JSONObject volumeObj = settings.optJSONObject("volume");
            JSONObject brightnessObj = settings.optJSONObject("brightness");
            activity.runOnUiThread(() -> {
                error.setVisibility(View.GONE);
                if (wifiObj != null) {
                    boolean on = wifiObj.optBoolean("enabled", false);
                    wifiOn.set(on);
                    tileWifi.setBackgroundResource(on ? R.drawable.bg_win11_qs_tile_on : R.drawable.bg_win11_qs_tile);
                    imageWifi.setImageResource(on ? R.drawable.ic_win11_wifi : R.drawable.ic_win11_wifi_off);
                    wifiSub.setText(subtitleWifi(wifiObj));
                }
                if (btObj != null) {
                    boolean on = btObj.optBoolean("enabled", false);
                    btOn.set(on);
                    tileBluetooth.setBackgroundResource(on ? R.drawable.bg_win11_qs_tile_on : R.drawable.bg_win11_qs_tile);
                    btSub.setText(subtitleBluetooth(btObj));
                }
                if (airplaneObj != null) {
                    boolean on = airplaneObj.optBoolean("enabled", false);
                    airOn.set(on);
                    tileAirplane.setBackgroundResource(on ? R.drawable.bg_win11_qs_tile_on : R.drawable.bg_win11_qs_tile);
                    airSub.setText(on ? "已开启" : "已关闭");
                }
                if (volumeObj != null) {
                    int level = volumeObj.optInt("level", 0);
                    boolean isMuted = volumeObj.optBoolean("muted", false) || level == 0;
                    muted.set(isMuted);
                    volumeBar.setProgress(level);
                    volumeValue.setText(String.valueOf(level));
                    muteBtn.setImageResource(isMuted ? R.drawable.ic_win11_volume_mute : R.drawable.ic_win11_volume);
                }
                if (brightnessObj != null) {
                    int level = brightnessObj.optInt("level", 0);
                    brightnessBar.setProgress(level);
                    brightnessValue.setText(String.valueOf(level));
                }
                if (listener != null && wifiObj != null && volumeObj != null) {
                    listener.onTrayStatus(
                            wifiObj.optBoolean("enabled", false),
                            volumeObj.optBoolean("muted", false) || volumeObj.optInt("level", 0) == 0
                    );
                }
            });
        } catch (Exception err) {
            activity.runOnUiThread(() -> {
                error.setVisibility(View.VISIBLE);
                error.setText(err.getMessage() == null ? "无法读取设备快速设置" : err.getMessage());
                error.setTextColor(0xFFC42B1C);
            });
        }
    }

    private static String subtitleWifi(JSONObject wifi) {
        if (!wifi.optBoolean("supported", true)) {
            return "不支持";
        }
        if (!wifi.optBoolean("enabled", false)) {
            return "已关闭";
        }
        if (wifi.optBoolean("connected", false) && !wifi.optString("name", "").isEmpty()) {
            return wifi.optString("name");
        }
        return "未连接";
    }

    private static String subtitleBluetooth(JSONObject bt) {
        if (!bt.optBoolean("supported", true)) {
            return "不支持";
        }
        if (!bt.optBoolean("enabled", false)) {
            return "已关闭";
        }
        if (bt.optBoolean("connected", false) && !bt.optString("name", "").isEmpty()) {
            return bt.optString("name");
        }
        return "未连接设备";
    }
}
