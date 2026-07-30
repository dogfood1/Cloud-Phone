package com.yiyi.cloud_phone.group;

import android.os.Bundle;
import android.util.DisplayMetrics;
import android.view.LayoutInflater;
import android.view.TextureView;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageButton;
import android.widget.PopupMenu;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.button.MaterialButton;
import com.yiyi.cloud_phone.AppIcons;
import com.yiyi.cloud_phone.R;
import com.yiyi.cloud_phone.logs.AppEventLogger;
import com.yiyi.cloud_phone.settings.ServerEndpointStore;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class GroupControlFragment extends Fragment {
    private final List<GroupDevice> groupDevices = new ArrayList<>();
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private GroupDeviceAdapter adapter;
    private GroupCastHub castHub;
    private GridLayoutManager gridLayout;
    private boolean batchMode;
    private String masterSerial;
    private MaterialButton batchModeBtn;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_group_control, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        castHub = new GroupCastHub(requireContext());
        castHub.setListener(device -> {
            if (adapter != null) {
                adapter.notifyDeviceUi(device);
            }
            if (getView() != null) {
                refreshChrome(getView());
            }
        });

        RecyclerView recycler = view.findViewById(R.id.recyclerGroup);
        DisplayMetrics metrics = getResources().getDisplayMetrics();
        gridLayout = new GridLayoutManager(requireContext(),
                GroupGridSpan.columns(metrics.widthPixels, metrics.density));
        recycler.setLayoutManager(gridLayout);
        recycler.addOnLayoutChangeListener((v, l, t, r, b, ol, ot, or, ob) -> {
            int next = GroupGridSpan.columns(v.getWidth(), metrics.density);
            if (gridLayout.getSpanCount() != next) {
                gridLayout.setSpanCount(next);
            }
        });

        adapter = new GroupDeviceAdapter();
        adapter.setListener(new GroupDeviceAdapter.Listener() {
            @Override
            public void onToggleActive(GroupDevice device) {
                device.active = !device.active;
                syncCast();
                adapter.notifyDeviceChanged(device);
                refreshChrome(view);
            }

            @Override
            public void onOpenMenu(GroupDevice device) {
                showDeviceOptions(device);
            }

            @Override
            public void onBindTexture(GroupDevice device, TextureView texture) {
                if (castHub != null) {
                    castHub.bind(device, texture);
                }
            }

            @Override
            public void onUnbindTexture(GroupDevice device, TextureView texture) {
                if (castHub != null) {
                    castHub.unbind(device, texture);
                }
            }
        });
        recycler.setAdapter(adapter);
        adapter.setDevices(groupDevices);

        batchModeBtn = view.findViewById(R.id.buttonBatchMode);
        setupActionIcons(view);
        View.OnClickListener addListener = v -> openPicker();
        view.findViewById(R.id.buttonAddGroupDevice).setOnClickListener(addListener);
        view.findViewById(R.id.buttonGroupEmptyAdd).setOnClickListener(addListener);
        view.findViewById(R.id.buttonGroupSelectAll).setOnClickListener(v -> setAllActive(true));
        view.findViewById(R.id.buttonGroupDeselectAll).setOnClickListener(v -> setAllActive(false));
        batchModeBtn.setOnClickListener(v -> toggleBatchMode());
        view.findViewById(R.id.buttonGroupPower).setOnClickListener(this::showPowerMenu);
        view.findViewById(R.id.buttonGroupVolume).setOnClickListener(this::showVolumeMenu);
        view.findViewById(R.id.buttonGroupApps).setOnClickListener(v ->
                new GroupAppBatchDialog(requireContext(), groupDevices, executor,
                        ServerEndpointStore.read(requireContext())).show());
        refreshChrome(view);
    }

    private void setupActionIcons(View view) {
        ImageButton addDevice = view.findViewById(R.id.buttonAddGroupDevice);
        addDevice.setImageDrawable(AppIcons.drawable(requireContext(), "cmd_plus", R.color.auth_primary, 22));
        ((MaterialButton) view.findViewById(R.id.buttonGroupPower)).setIcon(AppIcons.powerIcon(requireContext()));
        ((MaterialButton) view.findViewById(R.id.buttonGroupVolume)).setIcon(AppIcons.volumeIcon(requireContext()));
        ((MaterialButton) view.findViewById(R.id.buttonGroupApps)).setIcon(AppIcons.groupAppsIcon(requireContext()));
        batchModeBtn.setIcon(AppIcons.groupBatchIcon(requireContext()));
    }

    private void openPicker() {
        GroupDevicePicker.open(requireContext(), executor, groupDevices, next -> {
            groupDevices.clear();
            groupDevices.addAll(next);
            adapter.setDevices(groupDevices);
            syncCast();
            if (getView() != null) {
                refreshChrome(getView());
            }
            AppEventLogger.get().info("group", "devices_updated", "count=" + groupDevices.size());
        });
    }

    private void setAllActive(boolean active) {
        for (GroupDevice d : groupDevices) {
            d.active = active;
        }
        syncCast();
        adapter.setDevices(groupDevices);
        if (getView() != null) {
            refreshChrome(getView());
        }
    }

    private void syncCast() {
        if (castHub != null) {
            castHub.sync(groupDevices);
        }
    }

    private void refreshChrome(View view) {
        boolean hasDevices = !groupDevices.isEmpty();
        int visibility = hasDevices ? View.VISIBLE : View.GONE;
        view.findViewById(R.id.groupSelectionBar).setVisibility(visibility);
        view.findViewById(R.id.groupActionBar).setVisibility(visibility);
        view.findViewById(R.id.groupActionDivider).setVisibility(visibility);
        view.findViewById(R.id.textGroupEmpty).setVisibility(hasDevices ? View.GONE : View.VISIBLE);
        view.findViewById(R.id.recyclerGroup).setVisibility(hasDevices ? View.VISIBLE : View.GONE);
        if (hasDevices) {
            int active = 0;
            for (GroupDevice d : groupDevices) {
                if (d.active) {
                    active += 1;
                }
            }
            ((TextView) view.findViewById(R.id.textGroupSummary))
                    .setText(getString(R.string.group_summary_format, active, groupDevices.size()));
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
                        syncCast();
                        adapter.notifyDeviceChanged(device);
                    } else if (which == 1) {
                        masterSerial = device.serial;
                        adapter.setBatchMode(batchMode, masterSerial);
                        if (castHub != null) {
                            castHub.setBatchMode(batchMode, masterSerial);
                        }
                    } else if (which == 2) {
                        groupDevices.remove(device);
                        adapter.setDevices(groupDevices);
                        syncCast();
                    }
                    if (getView() != null) {
                        refreshChrome(getView());
                    }
                }).show();
    }

    private void toggleBatchMode() {
        batchMode = !batchMode;
        if (batchMode && masterSerial == null && !groupDevices.isEmpty()) {
            masterSerial = groupDevices.get(0).serial;
        }
        batchModeBtn.setText(batchMode ? R.string.group_action_stop_batch : R.string.group_action_batch_short);
        adapter.setBatchMode(batchMode, masterSerial);
        if (castHub != null) {
            castHub.setBatchMode(batchMode, masterSerial);
        }
        AppEventLogger.get().info("group", "batch_mode", "Batch mode: " + batchMode);
    }

    private void showPowerMenu(View anchor) {
        PopupMenu popup = new PopupMenu(requireContext(), anchor);
        popup.getMenu().add(0, 0, 0, R.string.group_power_screen_on);
        popup.getMenu().add(0, 1, 1, R.string.group_power_screen_off);
        popup.setOnMenuItemClickListener(item -> {
            broadcastNav(item.getItemId() == 0 ? "screen-on" : "screen-off");
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
            String action = item.getItemId() == 0 ? "volume-mute"
                    : item.getItemId() == 1 ? "volume-up" : "volume-down";
            broadcastNav(action);
            return true;
        });
        popup.show();
    }

    private void broadcastNav(String actionId) {
        if (castHub != null) {
            castHub.broadcastNavigation(groupDevices, actionId);
        }
        AppEventLogger.get().info("group", "broadcast_nav", actionId);
    }

    @Override
    public void onDestroyView() {
        if (castHub != null) {
            castHub.releaseAll();
            castHub = null;
        }
        super.onDestroyView();
    }

    @Override
    public void onDestroy() {
        executor.shutdown();
        super.onDestroy();
    }
}
