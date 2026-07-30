package com.yiyi.cloud_phone.workspace;

import android.view.View;
import android.widget.PopupMenu;

import androidx.appcompat.app.AppCompatActivity;

import com.yiyi.cloud_phone.R;
import com.yiyi.cloud_phone.apps.DeviceAppManagerActivity;
import com.yiyi.cloud_phone.files.DeviceFileExplorerActivity;
import com.yiyi.cloud_phone.terminal.DeviceTerminalActivity;

import java.util.List;

/** Header cast-mode popup and tool actions (files / apps / terminal). */
public final class WorkspaceHeaderMenu {
    public interface CastModeListener {
        void onCastModeSelected(CastMode mode);
    }

    private WorkspaceHeaderMenu() {
    }

    public static String shortModeLabel(CastMode mode) {
        if (mode == CastMode.MULTI_APP) {
            return "多应用";
        }
        if (mode == CastMode.CAMERA) {
            return "摄像头";
        }
        return "镜像";
    }

    public static void showCastModes(
            AppCompatActivity activity,
            View anchor,
            CastMode currentMode,
            List<CastOptionLists.Option> modes,
            CastModeListener listener
    ) {
        PopupMenu popup = new PopupMenu(activity, anchor);
        for (int i = 0; i < modes.size(); i++) {
            CastOptionLists.Option option = modes.get(i);
            popup.getMenu()
                    .add(R.id.workspace_menu_cast_modes, i, i, option.label)
                    .setCheckable(true)
                    .setChecked(option.value.equals(currentMode.id));
        }
        popup.getMenu().setGroupCheckable(R.id.workspace_menu_cast_modes, true, true);
        popup.setOnMenuItemClickListener(item -> {
            if (item.getGroupId() != R.id.workspace_menu_cast_modes || listener == null) {
                return false;
            }
            int index = item.getItemId();
            if (index < 0 || index >= modes.size()) {
                return true;
            }
            listener.onCastModeSelected(CastMode.fromId(modes.get(index).value));
            return true;
        });
        popup.show();
    }

    public static void bindToolButtons(
            AppCompatActivity activity,
            View files,
            View apps,
            View terminal,
            String serial,
            String displayName
    ) {
        if (files != null) {
            files.setOnClickListener(v ->
                    DeviceFileExplorerActivity.open(activity, serial, displayName, null));
        }
        if (apps != null) {
            apps.setOnClickListener(v ->
                    DeviceAppManagerActivity.open(activity, serial, displayName));
        }
        if (terminal != null) {
            terminal.setOnClickListener(v ->
                    DeviceTerminalActivity.open(activity, serial, displayName));
        }
    }
}
