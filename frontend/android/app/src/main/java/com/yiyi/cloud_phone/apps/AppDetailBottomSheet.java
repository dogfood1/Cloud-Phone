package com.yiyi.cloud_phone.apps;

import android.content.DialogInterface;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;

import com.google.android.material.bottomsheet.BottomSheetDialogFragment;
import com.yiyi.cloud_phone.CloudPhoneApiClient;
import com.yiyi.cloud_phone.R;
import com.yiyi.cloud_phone.files.DeviceFileExplorerActivity;
import com.yiyi.cloud_phone.settings.ServerEndpointStore;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class AppDetailBottomSheet extends BottomSheetDialogFragment {
    interface OnActionListener {
        void onUninstalled(String packageName);
        void onFrozenChanged(String packageName, boolean frozen);
        void onOpenDataDir(String path);
    }

    private AppItem app;
    private String deviceSerial;
    private String deviceDisplayName;
    private OnActionListener listener;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    static AppDetailBottomSheet newInstance(AppItem app, String serial, String displayName) {
        AppDetailBottomSheet sheet = new AppDetailBottomSheet();
        sheet.app = app;
        sheet.deviceSerial = serial;
        sheet.deviceDisplayName = displayName;
        return sheet;
    }

    void setOnActionListener(OnActionListener listener) {
        this.listener = listener;
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.bottom_sheet_app_detail, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        ((TextView) view.findViewById(R.id.appDetailLabel)).setText(app.label);
        ((TextView) view.findViewById(R.id.appDetailPackage)).setText(app.packageName);
        ((TextView) view.findViewById(R.id.appDetailVersion)).setText(app.versionName + " (" + app.versionCode + ")");
        ((TextView) view.findViewById(R.id.appDetailSdk)).setText(
                getString(R.string.apps_detail_sdk_target) + ": " + app.targetSdk
                        + "  " + getString(R.string.apps_detail_sdk_min) + ": " + app.minSdk);
        ((TextView) view.findViewById(R.id.appDetailEnabled)).setText(
                app.enabled ? R.string.apps_detail_enabled_yes : R.string.apps_detail_enabled_no);
        ((TextView) view.findViewById(R.id.appDetailDataDir)).setText(app.dataDir);

        Button btnUninstall = view.findViewById(R.id.btnDetailUninstall);
        Button btnFreeze = view.findViewById(R.id.btnDetailFreeze);
        Button btnExtract = view.findViewById(R.id.btnDetailExtract);
        Button btnDataDir = view.findViewById(R.id.btnDetailDataDir);
        Button btnForceStop = view.findViewById(R.id.btnDetailForceStop);

        btnFreeze.setText(app.frozen ? R.string.apps_action_unfreeze : R.string.apps_action_freeze);

        btnUninstall.setOnClickListener(v -> confirmUninstall());
        btnFreeze.setOnClickListener(v -> toggleFreeze(btnFreeze));
        btnExtract.setOnClickListener(v -> extractApk());
        btnForceStop.setOnClickListener(v -> forceStop());
        btnDataDir.setOnClickListener(v -> {
            dismiss();
            if (listener != null && !app.dataDir.isEmpty()) {
                listener.onOpenDataDir(app.dataDir);
            }
        });

        if (app.system) {
            btnUninstall.setEnabled(false);
        }
    }

    private void confirmUninstall() {
        new AlertDialog.Builder(requireContext())
                .setTitle(R.string.apps_uninstall_confirm_title)
                .setMessage(getString(R.string.apps_uninstall_confirm_message, app.label))
                .setPositiveButton(R.string.apps_action_uninstall, (d, w) -> doUninstall())
                .setNegativeButton(R.string.common_cancel, null)
                .show();
    }

    private void doUninstall() {
        ServerEndpointStore.Endpoint store = ServerEndpointStore.read(requireContext());
        executor.execute(() -> {
            try {
                CloudPhoneApiClient.uninstallApp(requireContext(), store.host, store.port, deviceSerial, app.packageName);
                runOnUi(() -> {
                    Toast.makeText(requireContext(), getString(R.string.apps_uninstall_success, app.label), Toast.LENGTH_SHORT).show();
                    if (listener != null) listener.onUninstalled(app.packageName);
                    dismiss();
                });
            } catch (Exception e) {
                runOnUi(() -> Toast.makeText(requireContext(), R.string.apps_uninstall_failed, Toast.LENGTH_SHORT).show());
            }
        });
    }

    private void toggleFreeze(Button btn) {
        boolean toFreeze = !app.frozen;
        ServerEndpointStore.Endpoint store = ServerEndpointStore.read(requireContext());
        executor.execute(() -> {
            try {
                CloudPhoneApiClient.setAppFrozen(requireContext(), store.host, store.port,
                        deviceSerial, app.packageName, toFreeze);
                runOnUi(() -> {
                    Toast.makeText(requireContext(),
                            toFreeze ? R.string.apps_freeze_success : R.string.apps_unfreeze_success,
                            Toast.LENGTH_SHORT).show();
                    if (listener != null) listener.onFrozenChanged(app.packageName, toFreeze);
                    dismiss();
                });
            } catch (Exception e) {
                runOnUi(() -> Toast.makeText(requireContext(), R.string.apps_freeze_failed, Toast.LENGTH_SHORT).show());
            }
        });
    }

    private void extractApk() {
        ServerEndpointStore.Endpoint store = ServerEndpointStore.read(requireContext());
        executor.execute(() -> {
            try {
                byte[] data = CloudPhoneApiClient.extractApk(requireContext(), store.host, store.port,
                        deviceSerial, app.packageName);
                String fileName = app.packageName + ".apk";
                File out = new File(android.os.Environment.getExternalStoragePublicDirectory(
                        android.os.Environment.DIRECTORY_DOWNLOADS), fileName);
                try (FileOutputStream fos = new FileOutputStream(out)) {
                    fos.write(data);
                }
                runOnUi(() -> Toast.makeText(requireContext(),
                        getString(R.string.apps_extract_apk_success, fileName), Toast.LENGTH_SHORT).show());
            } catch (Exception e) {
                runOnUi(() -> Toast.makeText(requireContext(), R.string.apps_extract_apk_failed, Toast.LENGTH_SHORT).show());
            }
        });
    }

    private void forceStop() {
        ServerEndpointStore.Endpoint store = ServerEndpointStore.read(requireContext());
        executor.execute(() -> {
            try {
                CloudPhoneApiClient.forceStopApp(requireContext(), store.host, store.port,
                        deviceSerial, app.packageName);
                runOnUi(() -> Toast.makeText(requireContext(), R.string.apps_force_stop_success, Toast.LENGTH_SHORT).show());
            } catch (Exception e) {
                runOnUi(() -> Toast.makeText(requireContext(), R.string.apps_force_stop_failed, Toast.LENGTH_SHORT).show());
            }
        });
    }

    private void runOnUi(Runnable r) {
        if (getActivity() != null) getActivity().runOnUiThread(r);
    }

    @Override
    public void onDismiss(@NonNull DialogInterface dialog) {
        super.onDismiss(dialog);
        executor.shutdown();
    }
}
