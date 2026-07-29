package com.yiyi.cloud_phone.group;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;

import com.yiyi.cloud_phone.CloudPhoneApiClient;
import com.yiyi.cloud_phone.R;
import com.yiyi.cloud_phone.settings.ServerEndpointStore;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;

class GroupAppBatchDialog {
    private final Context context;
    private final List<GroupDevice> devices;
    private final ExecutorService executor;
    private final ServerEndpointStore.Endpoint store;

    GroupAppBatchDialog(Context context, List<GroupDevice> devices, ExecutorService executor, ServerEndpointStore.Endpoint store) {
        this.context = context;
        this.devices = devices;
        this.executor = executor;
        this.store = store;
    }

    void show() {
        View dialogView = LayoutInflater.from(context).inflate(R.layout.dialog_group_app_batch, null);
        EditText packageInput = dialogView.findViewById(R.id.editBatchPackage);

        new AlertDialog.Builder(context)
                .setTitle(R.string.group_batch_app_title)
                .setView(dialogView)
                .setPositiveButton(R.string.group_batch_submit, (d, w) -> {
                    String pkg = packageInput.getText().toString().trim();
                    if (!pkg.isEmpty()) {
                        doUninstallBatch(pkg);
                    }
                })
                .setNegativeButton(R.string.common_cancel, null)
                .show();
    }

    private void doUninstallBatch(String packageName) {
        List<GroupDevice> active = new ArrayList<>();
        for (GroupDevice d : devices) if (d.active) active.add(d);

        executor.execute(() -> {
            Map<String, Boolean> results = new HashMap<>();
            for (GroupDevice device : active) {
                try {
                    CloudPhoneApiClient.uninstallApp(context, store.host, store.port, device.serial, packageName);
                    results.put(device.displayName, true);
                } catch (Exception e) {
                    results.put(device.displayName, false);
                }
            }
            if (context instanceof Activity) {
                ((Activity) context).runOnUiThread(() -> showResults(results));
            }
        });
    }

    private void showResults(Map<String, Boolean> results) {
        StringBuilder sb = new StringBuilder();
        int success = 0, failed = 0;
        for (Map.Entry<String, Boolean> e : results.entrySet()) {
            if (e.getValue()) { success++; sb.append("✓ ").append(e.getKey()).append("\n"); }
            else { failed++; sb.append("✗ ").append(e.getKey()).append("\n"); }
        }
        new AlertDialog.Builder(context)
                .setTitle(R.string.group_batch_result_title)
                .setMessage(context.getString(R.string.group_batch_result_success, success) + "\n"
                        + context.getString(R.string.group_batch_result_failed, failed) + "\n\n" + sb)
                .setPositiveButton(android.R.string.ok, null)
                .show();
    }
}
