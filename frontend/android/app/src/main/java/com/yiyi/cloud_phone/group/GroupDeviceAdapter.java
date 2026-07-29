package com.yiyi.cloud_phone.group;

import android.graphics.Bitmap;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.yiyi.cloud_phone.AppIcons;
import com.yiyi.cloud_phone.R;

import java.util.ArrayList;
import java.util.List;

class GroupDeviceAdapter extends RecyclerView.Adapter<GroupDeviceAdapter.ViewHolder> {
    interface OnDeviceClickListener {
        void onDeviceClick(GroupDevice device);
    }

    private final List<GroupDevice> devices = new ArrayList<>();
    private OnDeviceClickListener clickListener;
    private boolean batchModeActive;
    private String masterSerial;

    void setDevices(List<GroupDevice> list) {
        devices.clear();
        if (list != null) devices.addAll(list);
        notifyDataSetChanged();
    }

    void setBatchMode(boolean active, String masterSerial) {
        this.batchModeActive = active;
        this.masterSerial = masterSerial;
        notifyDataSetChanged();
    }

    void setOnDeviceClickListener(OnDeviceClickListener l) {
        this.clickListener = l;
    }

    void updateDevice(GroupDevice updated) {
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
        holder.bind(devices.get(position));
    }

    @Override
    public int getItemCount() {
        return devices.size();
    }

    class ViewHolder extends RecyclerView.ViewHolder {
        final TextView nameView;
        final ImageView screenshotView;
        final TextView statusView;
        final TextView badgeView;

        ViewHolder(@NonNull View itemView) {
            super(itemView);
            nameView = itemView.findViewById(R.id.groupDeviceName);
            screenshotView = itemView.findViewById(R.id.groupDeviceScreenshot);
            statusView = itemView.findViewById(R.id.groupDeviceStatus);
            badgeView = itemView.findViewById(R.id.groupDeviceBadge);
        }

        void bind(GroupDevice device) {
            nameView.setText(device.displayName);

            Bitmap ss = device.screenshot;
            if (ss != null) {
                screenshotView.setImageBitmap(ss);
            } else {
                screenshotView.setImageDrawable(AppIcons.devicePlaceholder(itemView.getContext()));
            }

            switch (device.castState) {
                case STARTING:
                    statusView.setText(R.string.group_cast_starting);
                    break;
                case STREAMING:
                    statusView.setText(R.string.group_cast_streaming);
                    break;
                case ERROR:
                    statusView.setText(device.errorMessage != null ? device.errorMessage : itemView.getContext().getString(R.string.group_cast_error));
                    break;
                default:
                    statusView.setText(R.string.group_cast_idle);
            }

            if (batchModeActive) {
                if (device.serial.equals(masterSerial)) {
                    badgeView.setVisibility(View.VISIBLE);
                    badgeView.setText(R.string.group_slot_master);
                    badgeView.setBackgroundColor(0xFFFFAB00);
                } else {
                    badgeView.setVisibility(View.VISIBLE);
                    badgeView.setText(R.string.group_slot_follower);
                    badgeView.setBackgroundColor(0xFF43A047);
                }
            } else {
                badgeView.setVisibility(View.GONE);
            }

            itemView.setOnClickListener(v -> {
                if (clickListener != null) clickListener.onDeviceClick(device);
            });
        }
    }
}
