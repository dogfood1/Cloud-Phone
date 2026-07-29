package com.yiyi.cloud_phone.logs;

import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.yiyi.cloud_phone.R;

import java.util.ArrayList;
import java.util.List;

class LogEntryAdapter extends RecyclerView.Adapter<LogEntryAdapter.ViewHolder> {
    private final List<LogEntry> entries = new ArrayList<>();

    void setEntries(List<LogEntry> newEntries) {
        entries.clear();
        if (newEntries != null) entries.addAll(newEntries);
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_log_entry, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        holder.bind(entries.get(position));
    }

    @Override
    public int getItemCount() {
        return entries.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        final TextView levelBadge;
        final TextView categoryBadge;
        final TextView messageView;
        final TextView timeView;
        final TextView eventView;

        ViewHolder(@NonNull View itemView) {
            super(itemView);
            levelBadge = itemView.findViewById(R.id.logLevelBadge);
            categoryBadge = itemView.findViewById(R.id.logCategoryBadge);
            messageView = itemView.findViewById(R.id.logMessage);
            timeView = itemView.findViewById(R.id.logTime);
            eventView = itemView.findViewById(R.id.logEvent);
        }

        void bind(LogEntry entry) {
            levelBadge.setText(entry.level.toUpperCase());
            levelBadge.setBackgroundColor(levelColor(entry.level));

            categoryBadge.setText(entry.category);
            messageView.setText(entry.message);
            timeView.setText(entry.displayTime);
            eventView.setText(entry.event != null ? entry.event : "");
            eventView.setVisibility(entry.event != null && !entry.event.isEmpty() ? View.VISIBLE : View.GONE);
        }

        private int levelColor(String level) {
            switch (level) {
                case AppEventLogger.LEVEL_ERROR: return 0xFFE53935;
                case AppEventLogger.LEVEL_WARN: return 0xFFFF8F00;
                case AppEventLogger.LEVEL_DEBUG: return 0xFF757575;
                default: return 0xFF1E88E5;
            }
        }
    }
}
