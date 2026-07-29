package com.yiyi.cloud_phone;



import android.content.Context;

import android.content.Intent;

import android.os.Bundle;

import android.view.View;

import android.widget.ArrayAdapter;

import android.widget.AutoCompleteTextView;

import android.widget.ImageButton;

import android.widget.TextView;

import android.widget.Toast;



import androidx.annotation.Nullable;

import androidx.appcompat.app.AppCompatActivity;

import androidx.core.view.WindowCompat;

import androidx.viewpager2.widget.ViewPager2;



import com.google.android.material.button.MaterialButton;

import com.google.android.material.tabs.TabLayout;

import com.google.android.material.tabs.TabLayoutMediator;

import com.yiyi.cloud_phone.apps.DeviceAppManagerActivity;
import com.yiyi.cloud_phone.cast.CastFullscreenActivity;
import com.yiyi.cloud_phone.cast.CastViewportController;
import com.yiyi.cloud_phone.files.DeviceFileExplorerActivity;
import com.yiyi.cloud_phone.terminal.DeviceTerminalActivity;

import com.yiyi.cloud_phone.workspace.CastMode;

import com.yiyi.cloud_phone.workspace.CastSettingsStore;

import com.yiyi.cloud_phone.workspace.DeviceWorkspaceHost;

import com.yiyi.cloud_phone.workspace.DeviceWorkspacePagerAdapter;



import org.json.JSONObject;



public class DeviceWorkspaceActivity extends AppCompatActivity implements DeviceWorkspaceHost {

    public static final String EXTRA_SERIAL = "device_serial";

    public static final String EXTRA_DISPLAY_NAME = "device_display_name";

    public static final String EXTRA_CONNECTED = "device_connected";

    public static final String EXTRA_SDK = "device_sdk";

    public static final String EXTRA_STATE = "device_state";

    public static final String EXTRA_PLATFORM = "device_platform";



    private String deviceSerial = "";

    private String devicePlatform = "android";

    private String deviceDisplayName = "";

    private boolean deviceConnected;

    private int deviceSdk;

    private CastMode castMode = CastMode.MIRROR;

    private JSONObject mirrorSettings;

    private JSONObject cameraSettings;



    private DeviceWorkspacePagerAdapter pagerAdapter;

    private TabLayoutMediator tabMediator;

    private AutoCompleteTextView inputCastMode;

    private TextView textHint;

    private MaterialButton buttonStartCast;

    private View castToolbarDock;

    private final CastViewportController castViewport = new CastViewportController();

    private boolean castActive;



    public static void open(Context context, DeviceItem device) {

        Intent intent = new Intent(context, DeviceWorkspaceActivity.class);

        intent.putExtra(EXTRA_SERIAL, device.serial);

        intent.putExtra(EXTRA_DISPLAY_NAME, device.displayName);

        intent.putExtra(EXTRA_CONNECTED, device.connected);

        intent.putExtra(EXTRA_SDK, parseSdk(device.sdkVersion));

        intent.putExtra(EXTRA_STATE, device.state);

        intent.putExtra(EXTRA_PLATFORM, device.platform);

        context.startActivity(intent);

    }



    @Override

    protected void onCreate(@Nullable Bundle savedInstanceState) {

        super.onCreate(savedInstanceState);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        setContentView(R.layout.activity_device_workspace);



        readIntentExtras();

        mirrorSettings = CastSettingsStore.loadMirror(this, deviceSerial);

        cameraSettings = CastSettingsStore.loadCamera(this, deviceSerial);

        castMode = CastSettingsStore.loadMode(this, deviceSerial);



        ImageButton buttonBack = findViewById(R.id.buttonBack);

        buttonBack.setImageDrawable(AppIcons.back(this));

        buttonBack.setOnClickListener(v -> finish());

        ImageButton buttonFiles = findViewById(R.id.buttonFiles);
        buttonFiles.setImageDrawable(AppIcons.workspaceFiles(this));
        buttonFiles.setOnClickListener(v -> {
            Intent filesIntent = new Intent(this, com.yiyi.cloud_phone.files.DeviceFileExplorerActivity.class);
            filesIntent.putExtra(EXTRA_SERIAL, deviceSerial);
            filesIntent.putExtra(EXTRA_DISPLAY_NAME, deviceDisplayName);
            startActivity(filesIntent);
        });

        ImageButton buttonApps = findViewById(R.id.buttonApps);
        buttonApps.setImageDrawable(AppIcons.workspaceApps(this));
        buttonApps.setOnClickListener(v -> {
            Intent appsIntent = new Intent(this, com.yiyi.cloud_phone.apps.DeviceAppManagerActivity.class);
            appsIntent.putExtra(EXTRA_SERIAL, deviceSerial);
            appsIntent.putExtra(EXTRA_DISPLAY_NAME, deviceDisplayName);
            startActivity(appsIntent);
        });

        ImageButton buttonTerminal = findViewById(R.id.buttonTerminal);
        buttonTerminal.setImageDrawable(AppIcons.workspaceTerminal(this));
        buttonTerminal.setOnClickListener(v -> {
            Intent termIntent = new Intent(this, com.yiyi.cloud_phone.terminal.DeviceTerminalActivity.class);
            termIntent.putExtra(EXTRA_SERIAL, deviceSerial);
            termIntent.putExtra(EXTRA_DISPLAY_NAME, deviceDisplayName);
            startActivity(termIntent);
        });

        TextView textDeviceName = findViewById(R.id.textDeviceName);

        textDeviceName.setText(deviceDisplayName);



        ImageButton btnFiles = findViewById(R.id.buttonWorkspaceFiles);

        btnFiles.setImageDrawable(AppIcons.workspaceFiles(this));

        btnFiles.setOnClickListener(v -> DeviceFileExplorerActivity.open(this, deviceSerial, deviceDisplayName, null));



        ImageButton btnApps = findViewById(R.id.buttonWorkspaceApps);

        btnApps.setImageDrawable(AppIcons.workspaceApps(this));

        btnApps.setOnClickListener(v -> DeviceAppManagerActivity.open(this, deviceSerial, deviceDisplayName));



        ImageButton btnTerminal = findViewById(R.id.buttonWorkspaceTerminal);

        btnTerminal.setImageDrawable(AppIcons.workspaceTerminal(this));

        btnTerminal.setOnClickListener(v -> DeviceTerminalActivity.open(this, deviceSerial, deviceDisplayName));



        textHint = findViewById(R.id.textHint);

        updateHint();



        buttonStartCast = findViewById(R.id.buttonStartCast);

        buttonStartCast.setEnabled(deviceConnected);

        buttonStartCast.setOnClickListener(v -> onStartCastRequested());

        castToolbarDock = findViewById(R.id.castToolbarDock);

        castViewport.bind(findViewById(R.id.castViewportRoot), new CastViewportController.Host() {

            @Override

            public AppCompatActivity activity() {

                return DeviceWorkspaceActivity.this;

            }



            @Override

            public String serial() {

                return deviceSerial;

            }



            @Override

            public int deviceSdk() {

                return deviceSdk;

            }



            @Override

            public CastMode castMode() {

                return castMode;

            }



            @Override

            public JSONObject settings() {

                return castMode == CastMode.CAMERA ? cameraSettings : mirrorSettings;

            }



            @Override

            public void onCastActiveChanged(boolean active) {

                castActive = active;

                buttonStartCast.setText(active ? R.string.cast_stop : R.string.workspace_start_cast);

                buttonStartCast.setEnabled(deviceConnected || active);

                if (castToolbarDock != null) {

                    castToolbarDock.setVisibility(active ? View.VISIBLE : View.GONE);

                }

            }



            @Override

            public void onCastFailed(String message) {

                castActive = false;

                buttonStartCast.setText(R.string.workspace_start_cast);

                buttonStartCast.setEnabled(deviceConnected);

            }

        }, true);

        castViewport.attachToolbarDock(
                findViewById(R.id.castToolbar),
                findViewById(R.id.castToolbarScroll),
                findViewById(R.id.castToolbarToggle),
                new CastViewportController.ToolbarHandler() {
                    @Override
                    public void onStopRequested() {
                        onStartCastRequested();
                    }

                    @Override
                    public void onRotateRequested() {
                        castViewport.rotatePreview();
                    }
                }
        );

        castViewport.setFullscreenClickListener(v -> {
            if (!castViewport.isCasting()) {
                return;
            }
            CastFullscreenActivity.open(
                    this,
                    deviceSerial,
                    deviceDisplayName,
                    deviceSdk,
                    castMode,
                    castViewport.exportStreamParams(),
                    castViewport.exportStartupLogs()
            );
        });



        setupCastModeSelector();

        setupSettingsPager();

    }



    private void readIntentExtras() {

        Intent intent = getIntent();

        deviceSerial = intent.getStringExtra(EXTRA_SERIAL);

        if (deviceSerial == null) {

            deviceSerial = "";

        }

        deviceDisplayName = intent.getStringExtra(EXTRA_DISPLAY_NAME);

        if (deviceDisplayName == null || deviceDisplayName.isEmpty()) {

            deviceDisplayName = deviceSerial;

        }

        deviceConnected = intent.getBooleanExtra(EXTRA_CONNECTED, false);

        deviceSdk = intent.getIntExtra(EXTRA_SDK, 0);

        String plat = intent.getStringExtra(EXTRA_PLATFORM);

        devicePlatform = plat != null ? plat : "android";

    }



    private void setupCastModeSelector() {

        inputCastMode = findViewById(R.id.inputCastMode);

        String[] labels = new String[] { "镜像投屏", "摄像头" };

        ArrayAdapter<String> adapter = new ArrayAdapter<>(

                this,

                android.R.layout.simple_list_item_1,

                labels

        );

        inputCastMode.setAdapter(adapter);

        inputCastMode.setText(castMode == CastMode.CAMERA ? labels[1] : labels[0], false);

        inputCastMode.setOnItemClickListener((parent, view, position, id) -> {

            CastMode next = position == 1 ? CastMode.CAMERA : CastMode.MIRROR;

            if (next != castMode) {

                persistSettings();

                setCastMode(next);

            }

        });

    }



    private void setupSettingsPager() {

        ViewPager2 pager = findViewById(R.id.settingsPager);

        TabLayout tabs = findViewById(R.id.settingsTabs);

        pagerAdapter = new DeviceWorkspacePagerAdapter(this);

        applyCastModeTabs(pager, tabs);

    }



    private void applyCastModeTabs(ViewPager2 pager, TabLayout tabs) {

        if (castMode == CastMode.CAMERA) {

            pagerAdapter.setCameraTabs();

        } else {

            pagerAdapter.setMirrorTabs();

        }

        pager.setAdapter(pagerAdapter);

        pager.setCurrentItem(0, false);

        if (tabMediator != null) {

            tabMediator.detach();

        }

        tabMediator = new TabLayoutMediator(tabs, pager, (tab, position) -> {

            tab.setText(pagerAdapter.tabTitle(position));

        });

        tabMediator.attach();

    }



    private void updateHint() {

        if (!deviceConnected) {

            textHint.setText(R.string.workspace_offline_hint);

            return;

        }

        textHint.setText(R.string.workspace_settings_hint);

    }



    @Override

    public String getDeviceSerial() {

        return deviceSerial;

    }



    @Override

    public String getDeviceDisplayName() {

        return deviceDisplayName;

    }



    @Override

    public int getDeviceSdk() {

        return deviceSdk;

    }



    @Override

    public boolean isDeviceConnected() {

        return deviceConnected;

    }



    @Override

    public CastMode getCastMode() {

        return castMode;

    }



    @Override

    public void setCastMode(CastMode mode) {

        castMode = mode;

        CastSettingsStore.saveMode(this, deviceSerial, castMode);

        ViewPager2 pager = findViewById(R.id.settingsPager);

        TabLayout tabs = findViewById(R.id.settingsTabs);

        applyCastModeTabs(pager, tabs);

    }



    @Override

    public JSONObject getMirrorSettings() {

        return mirrorSettings;

    }



    @Override

    public JSONObject getCameraSettings() {

        return cameraSettings;

    }



    @Override

    public boolean isSettingsLocked() {

        return castActive;

    }



    @Override

    public void persistSettings() {

        CastSettingsStore.saveMirror(this, deviceSerial, mirrorSettings);

        CastSettingsStore.saveCamera(this, deviceSerial, cameraSettings);

        CastSettingsStore.saveMode(this, deviceSerial, castMode);

    }



    @Override

    public void onStartCastRequested() {

        persistSettings();

        if (castActive) {

            castViewport.stopCast();

            return;

        }

        if (!deviceConnected) {

            Toast.makeText(this, R.string.workspace_offline_hint, Toast.LENGTH_SHORT).show();

            return;

        }

        castViewport.beginCast();

    }



    @Override

    public void onBackPressed() {

        if (castActive) {

            castViewport.stopCast();

            return;

        }

        super.onBackPressed();

    }



    @Override

    protected void onPause() {

        persistSettings();

        super.onPause();

    }



    @Override

    protected void onDestroy() {

        castViewport.release();

        if (tabMediator != null) {

            tabMediator.detach();

        }

        super.onDestroy();

    }



    private static int parseSdk(String raw) {

        try {

            return Integer.parseInt(raw);

        } catch (Exception error) {

            return 0;

        }

    }

}


