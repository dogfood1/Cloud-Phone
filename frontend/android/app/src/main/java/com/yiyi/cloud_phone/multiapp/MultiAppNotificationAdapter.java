package com.yiyi.cloud_phone.multiapp;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.yiyi.cloud_phone.R;

import java.util.ArrayList;
import java.util.List;

final class MultiAppNotificationAdapter extends RecyclerView.Adapter<MultiAppNotificationAdapter.Holder> {
    static final class Item {
        final String title;
        final String text;
        final String appLabel;
        final String iconDataUrl;

        Item(String title, String text, String appLabel, String iconDataUrl) {
            this.title = title;
            this.text = text;
            this.appLabel = appLabel;
            this.iconDataUrl = iconDataUrl;
        }
    }

    private final List<Item> items = new ArrayList<>();

    void setItems(List<Item> next) {
        items.clear();
        if (next != null) {
            items.addAll(next);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public Holder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_multi_app_notification, parent, false);
        return new Holder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull Holder holder, int position) {
        holder.bind(items.get(position));
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    static final class Holder extends RecyclerView.ViewHolder {
        final ImageView icon;
        final TextView initial;
        final TextView title;
        final TextView text;
        final TextView appLabel;

        Holder(@NonNull View itemView) {
            super(itemView);
            icon = itemView.findViewById(R.id.imageNotificationIcon);
            initial = itemView.findViewById(R.id.textNotificationInitial);
            title = itemView.findViewById(R.id.textNotificationTitle);
            text = itemView.findViewById(R.id.textNotificationText);
            appLabel = itemView.findViewById(R.id.textNotificationApp);
        }

        void bind(Item item) {
            title.setText(item.title);
            text.setText(item.text);
            appLabel.setText(item.appLabel);
            MultiAppIconUtil.bindIcon(icon, initial, item.appLabel, item.iconDataUrl);
        }
    }
}
