package com.yiyi.cloud_phone.files;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.yiyi.cloud_phone.AppIcons;
import com.yiyi.cloud_phone.R;

import java.util.ArrayList;
import java.util.List;

class FileEntryAdapter extends RecyclerView.Adapter<FileEntryAdapter.ViewHolder> {
    interface OnEntryClickListener {
        void onEntryClick(FileEntry entry);
    }

    interface OnDownloadClickListener {
        void onDownloadClick(FileEntry entry);
    }

    private final List<FileEntry> entries = new ArrayList<>();
    private OnEntryClickListener entryClickListener;
    private OnDownloadClickListener downloadClickListener;

    void setEntries(List<FileEntry> newEntries) {
        entries.clear();
        if (newEntries != null) entries.addAll(newEntries);
        notifyDataSetChanged();
    }

    void setOnEntryClickListener(OnEntryClickListener listener) {
        this.entryClickListener = listener;
    }

    void setOnDownloadClickListener(OnDownloadClickListener listener) {
        this.downloadClickListener = listener;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_file_entry, parent, false);
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

    class ViewHolder extends RecyclerView.ViewHolder {
        final ImageView iconView;
        final TextView nameView;
        final TextView sizeView;
        final TextView modifiedView;
        final ImageButton downloadButton;

        ViewHolder(@NonNull View itemView) {
            super(itemView);
            iconView = itemView.findViewById(R.id.fileIcon);
            nameView = itemView.findViewById(R.id.fileName);
            sizeView = itemView.findViewById(R.id.fileSize);
            modifiedView = itemView.findViewById(R.id.fileModified);
            downloadButton = itemView.findViewById(R.id.buttonDownload);
        }

        void bind(FileEntry entry) {
            Context ctx = itemView.getContext();
            nameView.setText(entry.name);
            modifiedView.setText(entry.modified);

            if (entry.isDirectory()) {
                iconView.setImageDrawable(AppIcons.fileFolder(ctx));
                sizeView.setText("—");
                downloadButton.setVisibility(View.GONE);
                itemView.setOnClickListener(v -> {
                    if (entryClickListener != null) entryClickListener.onEntryClick(entry);
                });
            } else if (entry.isSymlink()) {
                iconView.setImageDrawable(AppIcons.fileSymlink(ctx));
                sizeView.setText("→ " + entry.linkTarget);
                downloadButton.setVisibility(View.GONE);
                itemView.setOnClickListener(v -> {
                    if (entryClickListener != null) entryClickListener.onEntryClick(entry);
                });
            } else {
                iconView.setImageDrawable(AppIcons.fileFile(ctx));
                sizeView.setText(formatSize(entry.size));
                downloadButton.setVisibility(View.VISIBLE);
                downloadButton.setImageDrawable(AppIcons.download(ctx));
                downloadButton.setOnClickListener(v -> {
                    if (downloadClickListener != null) downloadClickListener.onDownloadClick(entry);
                });
                itemView.setOnClickListener(null);
            }
        }

        private String formatSize(long bytes) {
            if (bytes < 1024) return bytes + " B";
            double kb = bytes / 1024.0;
            if (kb < 1024) return String.format("%.1f KB", kb);
            double mb = kb / 1024.0;
            if (mb < 1024) return String.format("%.1f MB", mb);
            double gb = mb / 1024.0;
            return String.format("%.1f GB", gb);
        }
    }
}
