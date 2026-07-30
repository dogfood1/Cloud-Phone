package com.yiyi.cloud_phone.group;

import android.content.Context;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;

import com.yiyi.cloud_phone.CloudPhoneApiClient;
import com.yiyi.cloud_phone.DeviceItem;
import com.yiyi.cloud_phone.R;
import com.yiyi.cloud_phone.settings.ServerEndpointStore;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;

/** Device multi-select picker for group control. */
final class GroupDevicePicker {
    interface Callback {
        void onDevicesChosen(List<GroupDevice> next);
    }

    private GroupDevicePicker() {
    }

    static void open(
            Context context,
            ExecutorService executor,
            List<GroupDevice> current,
            Callback callback
    ) {
        ServerEndpointStore.Endpoint store = ServerEndpointStore.read(context);
        executor.execute(() -> {
            try {
                List<DeviceItem> devices = CloudPhoneApiClient.fetchDevices(context, store.host, store.port);
                android.os.Handler main = new android.os.Handler(context.getMainLooper());
                main.post(() -> present(context, devices, current, callback));
            } catch (Exception e) {
                android.os.Handler main = new android.os.Handler(context.getMainLooper());
                main.post(() -> Toast.makeText(context, e.getMessage(), Toast.LENGTH_SHORT).show());
            }
        });
    }

    private static void present(
            Context context,
            List<DeviceItem> devices,
            List<GroupDevice> current,
            Callback callback
    ) {
        List<String> names = new ArrayList<>();
        boolean[] checked = new boolean[devices.size()];
        for (int i = 0; i < devices.size(); i++) {
            DeviceItem d = devices.get(i);
            names.add(d.displayName + " (" + d.serial + ")");
            for (GroupDevice gd : current) {
                if (gd.serial.equals(d.serial)) {
                    checked[i] = true;
                    break;
                }
            }
        }
        new AlertDialog.Builder(context)
                .setTitle(R.string.group_pick_devices_title)
                .setMultiChoiceItems(names.toArray(new String[0]), checked, (d, which, isChecked) -> checked[which] = isChecked)
                .setPositiveButton(R.string.group_pick_done, (d, w) -> callback.onDevicesChosen(merge(devices, checked, current)))
                .setNegativeButton(R.string.common_cancel, null)
                .show();
    }

    private static List<GroupDevice> merge(List<DeviceItem> devices, boolean[] checked, List<GroupDevice> current) {
        Map<String, GroupDevice> existing = new HashMap<>();
        for (GroupDevice gd : current) {
            existing.put(gd.serial, gd);
        }
        List<GroupDevice> next = new ArrayList<>();
        for (int i = 0; i < devices.size(); i++) {
            if (!checked[i]) {
                continue;
            }
            DeviceItem dev = devices.get(i);
            GroupDevice kept = existing.get(dev.serial);
            if (kept != null) {
                next.add(kept);
            } else {
                next.add(new GroupDevice(dev.serial, dev.displayName, parseSdk(dev.sdkVersion)));
            }
        }
        return next;
    }

    private static int parseSdk(String raw) {
        if (raw == null || raw.isEmpty()) {
            return 0;
        }
        try {
            return Integer.parseInt(raw.trim());
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }
}
