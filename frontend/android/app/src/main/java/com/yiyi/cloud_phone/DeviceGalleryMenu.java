package com.yiyi.cloud_phone;

import android.app.AlertDialog;
import android.content.Context;
import android.view.Menu;
import android.view.View;
import android.widget.PopupMenu;
import android.widget.Toast;

import androidx.fragment.app.Fragment;

import java.util.concurrent.ExecutorService;

final class DeviceGalleryMenu {
    private static final int ACTION_VIEW = 1;
    private static final int ACTION_DISCONNECT = 2;

    interface RefreshCallback {
        void onDevicesChanged();
    }

    private DeviceGalleryMenu() {
    }

    static void show(
            Fragment fragment,
            DeviceItem device,
            View anchor,
            ExecutorService networkExecutor,
            String host,
            int port,
            RefreshCallback refreshCallback
    ) {
        Context context = fragment.requireContext();
        PopupMenu menu = new PopupMenu(context, anchor);
        menu.getMenu().add(
                Menu.NONE,
                ACTION_VIEW,
                Menu.NONE,
                context.getString(R.string.device_action_view_details)
        );
        if (device.wireless) {
            menu.getMenu().add(
                    Menu.NONE,
                    ACTION_DISCONNECT,
                    Menu.NONE,
                    context.getString(R.string.device_action_disconnect)
            );
        }
        menu.setOnMenuItemClickListener(item -> {
            if (item.getItemId() == ACTION_VIEW) {
                DeviceWorkspaceActivity.open(context, device);
                return true;
            }
            if (item.getItemId() == ACTION_DISCONNECT) {
                confirmDisconnect(fragment, device, networkExecutor, host, port, refreshCallback);
                return true;
            }
            return false;
        });
        menu.show();
    }

    private static void confirmDisconnect(
            Fragment fragment,
            DeviceItem device,
            ExecutorService networkExecutor,
            String host,
            int port,
            RefreshCallback refreshCallback
    ) {
        new AlertDialog.Builder(fragment.requireContext())
                .setTitle(R.string.device_disconnect_confirm_title)
                .setMessage(
                        fragment.getString(
                                R.string.device_disconnect_confirm_message,
                                device.displayName
                        )
                )
                .setPositiveButton(android.R.string.ok, (dialog, which) ->
                        disconnect(fragment, device, networkExecutor, host, port, refreshCallback)
                )
                .setNegativeButton(android.R.string.cancel, null)
                .show();
    }

    private static void disconnect(
            Fragment fragment,
            DeviceItem device,
            ExecutorService networkExecutor,
            String host,
            int port,
            RefreshCallback refreshCallback
    ) {
        Context appContext = fragment.requireContext().getApplicationContext();
        networkExecutor.execute(() -> {
            try {
                CloudPhoneApiClient.disconnectDevice(appContext, host, port, device.serial);
                fragment.requireActivity().runOnUiThread(() -> {
                    if (!fragment.isAdded()) {
                        return;
                    }
                    Toast.makeText(
                            appContext,
                            appContext.getString(
                                    R.string.device_disconnect_success,
                                    device.displayName
                            ),
                            Toast.LENGTH_SHORT
                    ).show();
                    refreshCallback.onDevicesChanged();
                });
            } catch (Exception error) {
                String message = error.getMessage();
                if (message == null || message.isEmpty()) {
                    message = appContext.getString(R.string.device_disconnect_failed);
                }
                String finalMessage = message;
                fragment.requireActivity().runOnUiThread(() -> {
                    if (!fragment.isAdded()) {
                        return;
                    }
                    Toast.makeText(appContext, finalMessage, Toast.LENGTH_LONG).show();
                });
            }
        });
    }
}
