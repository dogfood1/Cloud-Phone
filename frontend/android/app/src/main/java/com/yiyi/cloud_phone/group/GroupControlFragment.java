package com.yiyi.cloud_phone.group;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.PopupMenu;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.yiyi.cloud_phone.CloudPhoneApiClient;
import com.yiyi.cloud_phone.DeviceItem;
import com.yiyi.cloud_phone.R;
import com.yiyi.cloud_phone.logs.AppEventLogger;
import com.yiyi.cloud_phone.settings.ServerEndpointStore;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class GroupControlFragment extends Fragment {
    private GroupDeviceAdapter adapter;
    private final List<GroupDevice> groupDevices = new ArrayList<>();
    private boolean batchMode = false;
    private String masterSerial = null;
    private Button batchModeBtn;
    private final ExecutorService executor = Executors.newCachedThreadPool();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_group_control, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        RecyclerView recycler = view.findViewById(R.id.recyclerGroup);
        int cols = Math.max(2, getResources().getDisplayMetrics().widthPixels / getResources().getDisplayMetrics().densityDpi > 6 ? 3 : 2);
        recycler.setLayoutManager(new GridLayoutManager(requireContext(), 2));
        adapter = new GroupDeviceAdapter();
        adapter.setOnDeviceClickListener(device -> showDeviceOptions(device));
        recycler.setAdapter(adapter);
        adapter.setDevices(groupDevices);

        view.findViewById(R.id.buttonAddGroupDevice).setOnClickListener(v -> showDevicePicker());
        view.findViewById(R.id.buttonGroupSelectAll).setOnClickListener(v -> {
            for (GroupDevice d : groupDevices) d.active = true;
            adapter.setDevices(groupDevices);
        });
        view.findViewById(R.id.buttonGroupDeselectAll).setOnClickListener(v -> {
            for (GroupDevice d : groupDevices) d.active = false;
            adapter.setDevices(groupDevices);
        });

        batchModeBtn = view.findViewById(R.id.buttonBatchMode);
        batchModeBtn.setOnClickListener(v -> toggleBatchMode());

        view.findViewById(R.id.buttonGroupPower).setOnClickListener(v -> showPowerMenu(v));
        view.findViewById(R.id.buttonGroupVolume).setOnClickListener(v -> showVolumeMenu(v));
        view.findViewById(R.id.buttonGroupApps).setOnClickListener(v -> showAppBatchDialog());

        updateEmptyState(view);
    }

    private void updateEmptyState(View view) {
        View empty = view.findViewById(R.id.textGroupEmpty);
        RecyclerView recycler = view.findViewById(R.id.recyclerGroup);
        if (empty != null) {
            empty.setVisibility(groupDevices.isEmpty() ? View.VISIBLE : View.GONE);
            recycler.setVisibility(groupDevices.isEmpty() ? View.GONE : View.VISIBLE);
        }
    }

    private void showDevicePicker() {
        ServerEndpointStore.Endpoint store = ServerEndpointStore.read(requireContext());
        executor.execute(() -> {
            try {
                List<DeviceItem> devices = CloudPhoneApiClient.fetchDevices(requireContext(), store.host, store.port);
                requireActivity().runOnUiThread(() -> {
                    List<String> names = new ArrayList<>();
                    boolean[] checked = new boolean[devices.size()];
                    for (int i = 0; i < devices.size(); i++) {
                        DeviceItem d = devices.get(i);
                        names.add(d.displayName + " (" + d.serial + ")");
                        for (GroupDevice gd : groupDevices) {
                            if (gd.serial.equals(d.serial)) { checked[i] = true; break; }
                        }
                    }
                    new AlertDialog.Builder(requireContext())
                            .setTitle(R.string.group_pick_devices_title)
                            .setMultiChoiceItems(names.toArray(new String[0]), checked, (d, which, isChecked) -> checked[which] = isChecked)
                            .setPositiveButton(R.string.group_pick_done, (d, w) -> {
                                groupDevices.clear();
                                for (int i = 0; i < devices.size(); i++) {
                                    if (checked[i]) {
                                        DeviceItem dev = devices.get(i);
                                        groupDevices.add(new GroupDevice(dev.serial, dev.displayName));
                                    }
                                }
                                adapter.setDevices(groupDevices);
                                if (getView() != null) updateEmptyState(getView());
                                loadScreenshots();
                            })
                            .setNegativeButton(R.string.common_cancel, null)
                            .show();
                });
            } catch (Exception e) {
                requireActivity().runOnUiThread(() ->
                        Toast.makeText(requireContext(), e.getMessage(), Toast.LENGTH_SHORT).show());
            }
        });
    }

    private void loadScreenshots() {
        ServerEndpointStore.Endpoint store = ServerEndpointStore.read(requireContext());
        for (GroupDevice device : groupDevices) {
            final GroupDevice gd = device;
            executor.execute(() -> {
                try {
                    byte[] data = CloudPhoneApiClient.fetchScreenshot(requireContext(), store.host, store.port, gd.serial, System.currentTimeMillis());
                    Bitmap bmp = BitmapFactory.decodeByteArray(data, 0, data.length);
                    gd.screenshot = bmp;
                    requireActivity().runOnUiThread(() -> adapter.updateDevice(gd));
                } catch (Exception ignored) {
                }
            });
        }
    }

    private void showDeviceOptions(GroupDevice device) {
        new AlertDialog.Builder(requireContext())
                .setTitle(device.displayName)
                .setItems(new String[]{
                        device.active ? getString(R.string.group_device_inactive) : getString(R.string.group_device_active),
                        getString(R.string.group_master_pick_title),
                        getString(R.string.device_action_disconnect)
                }, (d, which) -> {
                    if (which == 0) {
                        device.active = !device.active;
                        adapter.updateDevice(device);
                    } else if (which == 1) {
                        masterSerial = device.serial;
                        adapter.setBatchMode(batchMode, masterSerial);
                    } else if (which == 2) {
                        groupDevices.remove(device);
                        adapter.setDevices(groupDevices);
                        if (getView() != null) updateEmptyState(getView());
                    }
                }).show();
    }

    private void toggleBatchMode() {
        batchMode = !batchMode;
        if (batchMode && masterSerial == null && !groupDevices.isEmpty()) {
            masterSerial = groupDevices.get(0).serial;
        }
        batchModeBtn.setText(batchMode ? R.string.group_action_stop_batch : R.string.group_action_batch_mode);
        adapter.setBatchMode(batchMode, masterSerial);
        AppEventLogger.get().info("group", "batch_mode", "Batch mode: " + batchMode);
    }

    private void showPowerMenu(View anchor) {
        PopupMenu popup = new PopupMenu(requireContext(), anchor);
        popup.getMenu().add(0, 0, 0, R.string.group_power_screen_on);
        popup.getMenu().add(0, 1, 1, R.string.group_power_screen_off);
        popup.setOnMenuItemClickListener(item -> {
            sendNavigationToAll(item.getItemId() == 0 ? "power_on" : "power_off");
            return true;
        });
        popup.show();
    }

    private void showVolumeMenu(View anchor) {
        PopupMenu popup = new PopupMenu(requireContext(), anchor);
        popup.getMenu().add(0, 0, 0, R.string.group_volume_mute);
        popup.getMenu().add(0, 1, 1, R.string.group_volume_up);
        popup.getMenu().add(0, 2, 2, R.string.group_volume_down);
        popup.setOnMenuItemClickListener(item -> {
            String action = item.getItemId() == 0 ? "volume_mute" : item.getItemId() == 1 ? "volume_up" : "volume_down";
            sendNavigationToAll(action);
            return true;
        });
        popup.show();
    }

    private void sendNavigationToAll(String action) {
        ServerEndpointStore.Endpoint store = ServerEndpointStore.read(requireContext());
        List<GroupDevice> active = new ArrayList<>();
        for (GroupDevice d : groupDevices) if (d.active) active.add(d);

        List<String> results = new ArrayList<>();
        executor.execute(() -> {
            for (GroupDevice device : active) {
                try {
                    JSONObject payload = new JSONObject();
                    payload.put("type", "navigation");
                    payload.put("action", action);
                    AppEventLogger.get().info("group", "broadcast_nav", action + " -> " + device.serial);
                } catch (Exception e) {
                    results.add(device.displayName + ": " + e.getMessage());
                }
            }
        });
    }

    private void showAppBatchDialog() {
        GroupAppBatchDialog dialog = new GroupAppBatchDialog(requireContext(), groupDevices, executor,
                ServerEndpointStore.read(requireContext()));
        dialog.show();
    }

    @Override
    public void onDestroyView() {
        executor.shutdown();
        super.onDestroyView();
    }
}
