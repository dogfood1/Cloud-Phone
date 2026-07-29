package com.yiyi.cloud_phone.logs;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.chip.Chip;
import com.google.android.material.chip.ChipGroup;
import com.yiyi.cloud_phone.R;

import java.util.ArrayList;
import java.util.List;

public class LogsFragment extends Fragment {
    private LogEntryAdapter adapter;
    private String levelFilter = "all";
    private String categoryFilter = "all";
    private String searchQuery = "";

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_logs, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        RecyclerView recycler = view.findViewById(R.id.recyclerLogs);
        recycler.setLayoutManager(new LinearLayoutManager(requireContext()));
        adapter = new LogEntryAdapter();
        recycler.setAdapter(adapter);

        EditText searchEdit = view.findViewById(R.id.editLogSearch);
        searchEdit.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int st, int c, int a) {}
            @Override public void onTextChanged(CharSequence s, int st, int b, int c) {
                searchQuery = s.toString().toLowerCase();
                refreshList();
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        Button clearBtn = view.findViewById(R.id.buttonClearLogs);
        clearBtn.setOnClickListener(v -> {
            new AlertDialog.Builder(requireContext())
                    .setTitle(R.string.logs_clear_confirm_title)
                    .setMessage(R.string.logs_clear_confirm_message)
                    .setPositiveButton(R.string.logs_clear, (d, w) -> {
                        AppEventLogger.get().clear();
                        refreshList();
                    })
                    .setNegativeButton(R.string.common_cancel, null)
                    .show();
        });

        ChipGroup levelChips = view.findViewById(R.id.chipGroupLevel);
        setupLevelChips(levelChips);

        ChipGroup catChips = view.findViewById(R.id.chipGroupCategory);
        setupCategoryChips(catChips);

        AppEventLogger.get().setOnLogChangedListener(() -> {
            if (isAdded()) requireActivity().runOnUiThread(this::refreshList);
        });

        refreshList();
    }

    private void setupLevelChips(ChipGroup group) {
        String[] levels = {"all", "debug", "info", "warn", "error"};
        int[] labels = {R.string.logs_level_all, R.string.logs_level_debug, R.string.logs_level_info, R.string.logs_level_warn, R.string.logs_level_error};
        for (int i = 0; i < levels.length; i++) {
            Chip chip = new Chip(requireContext());
            chip.setText(labels[i]);
            chip.setCheckable(true);
            chip.setChecked(i == 0);
            final String level = levels[i];
            chip.setOnCheckedChangeListener((btn, checked) -> {
                if (checked) {
                    levelFilter = level;
                    refreshList();
                }
            });
            group.addView(chip);
        }
        group.setSingleSelection(true);
    }

    private void setupCategoryChips(ChipGroup group) {
        String[] cats = {"all", "auth", "device", "cast", "files", "apps", "terminal", "group", "settings"};
        int[] labels = {R.string.logs_cat_all, R.string.logs_cat_auth, R.string.logs_cat_device,
                R.string.logs_cat_cast, R.string.logs_cat_files, R.string.logs_cat_apps,
                R.string.logs_cat_terminal, R.string.logs_cat_group, R.string.logs_cat_settings};
        for (int i = 0; i < cats.length; i++) {
            Chip chip = new Chip(requireContext());
            chip.setText(labels[i]);
            chip.setCheckable(true);
            chip.setChecked(i == 0);
            final String cat = cats[i];
            chip.setOnCheckedChangeListener((btn, checked) -> {
                if (checked) {
                    categoryFilter = cat;
                    refreshList();
                }
            });
            group.addView(chip);
        }
        group.setSingleSelection(true);
    }

    private void refreshList() {
        List<LogEntry> all = AppEventLogger.get().getEntries();
        List<LogEntry> filtered = new ArrayList<>();
        for (LogEntry e : all) {
            if (!"all".equals(levelFilter) && !levelFilter.equals(e.level)) continue;
            if (!"all".equals(categoryFilter) && !categoryFilter.equals(e.category)) continue;
            if (!searchQuery.isEmpty()) {
                boolean match = e.message.toLowerCase().contains(searchQuery)
                        || (e.event != null && e.event.toLowerCase().contains(searchQuery))
                        || (e.category != null && e.category.toLowerCase().contains(searchQuery));
                if (!match) continue;
            }
            filtered.add(e);
        }
        adapter.setEntries(filtered);
    }

    @Override
    public void onDestroyView() {
        AppEventLogger.get().setOnLogChangedListener(null);
        super.onDestroyView();
    }
}
