package com.yiyi.cloud_phone.group;

import android.view.LayoutInflater;
import android.view.TextureView;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.yiyi.cloud_phone.R;

import java.util.ArrayList;
import java.util.List;

class GroupDeviceAdapter extends RecyclerView.Adapter<GroupDeviceAdapter.ViewHolder> {
    private static final Object PAYLOAD_UI = new Object();

    interface Listener {
        void onToggleActive(GroupDevice device);

        void onOpenMenu(GroupDevice device);

        void onBindTexture(GroupDevice device, TextureView texture);

        void onUnbindTexture(GroupDevice device, TextureView texture);
    }

    private final List<GroupDevice> devices = new ArrayList<>();
    private Listener listener;
    private boolean batchModeActive;
    private String masterSerial;

    void setListener(Listener listener) {
        this.listener = listener;
    }

    void setDevices(List<GroupDevice> list) {
        devices.clear();
        if (list != null) {
            devices.addAll(list);
        }
        notifyDataSetChanged();
    }

    void setBatchMode(boolean active, String masterSerial) {
        this.batchModeActive = active;
        this.masterSerial = masterSerial;
        notifyDataSetChanged();
    }

    void notifyDeviceUi(GroupDevice updated) {
        for (int i = 0; i < devices.size(); i++) {
            if (devices.get(i).serial.equals(updated.serial)) {
                devices.set(i, updated);
                notifyItemChanged(i, PAYLOAD_UI);
                return;
            }
        }
    }

    void notifyDeviceChanged(GroupDevice updated) {
        for (int i = 0; i < devices.size(); i++) {
            if (devices.get(i).serial.equals(updated.serial)) {
                devices.set(i, updated);
                notifyItemChanged(i);
                return;
            }
        }
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_group_slot, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        holder.bind(devices.get(position), true);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position, @NonNull List<Object> payloads) {
        if (payloads.isEmpty()) {
            onBindViewHolder(holder, position);
            return;
        }
        holder.bind(devices.get(position), false);
    }

    @Override
    public void onViewRecycled(@NonNull ViewHolder holder) {
        holder.unbind();
        super.onViewRecycled(holder);
    }

    @Override
    public int getItemCount() {
        return devices.size();
    }

    class ViewHolder extends RecyclerView.ViewHolder {
        final View header;
        final TextView nameView;
        final TextView checkView;
        final TextureView textureView;
        final TextView logsView;
        final TextView inactiveView;
        final TextView statusView;
        final TextView badgeView;
        GroupDevice bound;

        ViewHolder(@NonNull View itemView) {
            super(itemView);
            header = itemView.findViewById(R.id.groupSlotHeader);
            nameView = itemView.findViewById(R.id.groupDeviceName);
            checkView = itemView.findViewById(R.id.groupDeviceCheck);
            textureView = itemView.findViewById(R.id.groupDeviceTexture);
            logsView = itemView.findViewById(R.id.groupDeviceLogs);
            inactiveView = itemView.findViewById(R.id.groupDeviceInactive);
            statusView = itemView.findViewById(R.id.groupDeviceStatus);
            badgeView = itemView.findViewById(R.id.groupDeviceBadge);
        }

        void bind(GroupDevice device, boolean bindSurface) {
            bound = device;
            nameView.setText(device.displayName);
            itemView.setBackgroundResource(device.active ? R.drawable.bg_group_slot_active : R.drawable.bg_group_slot);
            checkView.setBackgroundResource(device.active ? R.drawable.bg_group_check_on : R.drawable.bg_group_check_off);
            checkView.setText(device.active ? "✓" : "");

            switch (device.castState) {
                case STARTING:
                    statusView.setText(R.string.group_cast_starting);
                    break;
                case STREAMING:
                    statusView.setText(R.string.group_cast_streaming);
                    break;
                case ERROR:
                    statusView.setText(device.errorMessage != null
                            ? device.errorMessage
                            : itemView.getContext().getString(R.string.group_cast_error));
                    break;
                default:
                    statusView.setText(R.string.group_cast_idle);
            }

            boolean showLogs = device.active && device.showLogs
                    && (device.castState == GroupDevice.CastState.STARTING
                    || device.castState == GroupDevice.CastState.ERROR
                    || (device.startupLog != null && !device.startupLog.isEmpty()
                    && device.castState != GroupDevice.CastState.STREAMING));
            if (showLogs) {
                logsView.setVisibility(View.VISIBLE);
                logsView.setText(device.startupLog == null ? "" : device.startupLog);
            } else {
                logsView.setVisibility(View.GONE);
            }

            inactiveView.setVisibility(device.active ? View.GONE : View.VISIBLE);

            if (batchModeActive) {
                badgeView.setVisibility(View.VISIBLE);
                if (device.serial.equals(masterSerial)) {
                    badgeView.setText(R.string.group_slot_master);
                    badgeView.setBackgroundResource(R.drawable.bg_group_badge_master);
                } else {
                    badgeView.setText(R.string.group_slot_follower);
                    badgeView.setBackgroundResource(R.drawable.bg_group_badge);
                }
            } else {
                badgeView.setVisibility(View.GONE);
            }

            header.setOnClickListener(v -> {
                if (listener != null) {
                    listener.onToggleActive(device);
                }
            });
            header.setOnLongClickListener(v -> {
                if (listener != null) {
                    listener.onOpenMenu(device);
                }
                return true;
            });
            itemView.setOnLongClickListener(v -> {
                if (listener != null) {
                    listener.onOpenMenu(device);
                }
                return true;
            });

            if (bindSurface && listener != null) {
                if (device.active) {
                    listener.onBindTexture(device, textureView);
                } else {
                    listener.onUnbindTexture(device, textureView);
                }
            }
        }

        void unbind() {
            if (bound != null && listener != null) {
                listener.onUnbindTexture(bound, textureView);
            }
            bound = null;
        }
    }
}
