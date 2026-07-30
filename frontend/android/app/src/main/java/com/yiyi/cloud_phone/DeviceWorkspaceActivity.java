package com.yiyi.cloud_phone;



import android.content.Context;

import android.content.Intent;

import android.content.res.Configuration;

import android.os.Bundle;

import android.view.View;

import android.widget.ArrayAdapter;

import android.widget.AutoCompleteTextView;

import android.widget.ImageButton;

import android.widget.TextView;

import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;

import androidx.constraintlayout.widget.ConstraintLayout;
import androidx.constraintlayout.widget.ConstraintSet;
import androidx.constraintlayout.widget.Guideline;

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

import com.yiyi.cloud_phone.multiapp.MultiAppDesktopActivity;
import com.yiyi.cloud_phone.multiapp.MultiAppDesktopEmbed;
import com.yiyi.cloud_phone.workspace.CastMode;

import com.yiyi.cloud_phone.workspace.CastOptionLists;
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

    private AutoCompleteTextView inputCastModeHeader;

    private TextView textHint;

    private MaterialButton buttonStartCast;

    private View castToolbarDock;

    private View castViewportHost;

    private final CastViewportController castViewport = new CastViewportController();

    private boolean castActive;

    private View castViewportRoot;

    private View leftPane;

    private MultiAppDesktopEmbed multiAppDesktop;

    private ActivityResultLauncher<Intent> multiAppFullscreenLauncher;



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

        multiAppFullscreenLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (result.getResultCode() == MultiAppDesktopActivity.RESULT_SWITCH_MIRROR) {
                        setCastMode(CastMode.MIRROR);
                        java.util.List<CastOptionLists.Option> modes = CastOptionLists.castModes();
                        String label = castModeLabel(modes, CastMode.MIRROR);
                        if (inputCastMode != null) {
                            inputCastMode.setText(label, false);
                        }
                        if (inputCastModeHeader != null) {
                            inputCastModeHeader.setText(label, false);
                        }
                        return;
                    }
                    if (castMode == CastMode.MULTI_APP && deviceConnected && multiAppDesktop != null) {
                        multiAppDesktop.show();
                    }
                }
        );

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

        castViewportHost = findViewById(R.id.castViewportHost);

        castViewportRoot = findViewById(R.id.castViewportRoot);

        leftPane = findViewById(R.id.leftPane);

        multiAppDesktop = new MultiAppDesktopEmbed(this, deviceSerial, deviceSdk, new MultiAppDesktopEmbed.Callback() {
            @Override
            public void onSwitchMirror() {
                setCastMode(CastMode.MIRROR);
                java.util.List<CastOptionLists.Option> modes = CastOptionLists.castModes();
                String label = castModeLabel(modes, CastMode.MIRROR);
                if (inputCastMode != null) {
                    inputCastMode.setText(label, false);
                }
                if (inputCastModeHeader != null) {
                    inputCastModeHeader.setText(label, false);
                }
            }

            @Override
            public void onOpenFullscreen() {
                openMultiAppFullscreen();
            }
        });

        multiAppDesktop.attach(findViewById(R.id.multiAppRoot));

        castViewport.bind(castViewportRoot, new CastViewportController.Host() {

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



    private void openMultiAppFullscreen() {
        if (!deviceConnected) {
            Toast.makeText(this, R.string.workspace_offline_hint, Toast.LENGTH_SHORT).show();
            return;
        }
        Intent intent = new Intent(this, MultiAppDesktopActivity.class);
        intent.putExtra(MultiAppDesktopActivity.EXTRA_SERIAL, deviceSerial);
        intent.putExtra(MultiAppDesktopActivity.EXTRA_DISPLAY_NAME, deviceDisplayName);
        intent.putExtra(MultiAppDesktopActivity.EXTRA_SDK, deviceSdk);
        multiAppFullscreenLauncher.launch(intent);
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

        inputCastModeHeader = findViewById(R.id.inputCastModeHeader);

        java.util.List<CastOptionLists.Option> modes = CastOptionLists.castModes();

        java.util.List<String> labels = new java.util.ArrayList<>();

        for (CastOptionLists.Option option : modes) {

            labels.add(option.label);

        }

        ArrayAdapter<String> adapter = new ArrayAdapter<>(

                this,

                android.R.layout.simple_list_item_1,

                labels

        );

        bindCastModeDropdown(inputCastMode, adapter, modes);

        bindCastModeDropdown(inputCastModeHeader, adapter, modes);

        applyMultiAppModeLayout();

    }



    private void bindCastModeDropdown(

            AutoCompleteTextView view,

            ArrayAdapter<String> adapter,

            java.util.List<CastOptionLists.Option> modes

    ) {

        if (view == null) {

            return;

        }

        view.setAdapter(adapter);

        view.setText(castModeLabel(modes, castMode), false);

        view.setOnItemClickListener((parent, itemView, position, id) -> {

            CastMode next = castModeAt(modes, position);

            if (next != castMode) {

                persistSettings();

                setCastMode(next);

            }

        });

    }



    private static String castModeLabel(java.util.List<CastOptionLists.Option> modes, CastMode mode) {

        for (CastOptionLists.Option option : modes) {

            if (option.value.equals(mode.id)) {

                return option.label;

            }

        }

        return modes.isEmpty() ? "" : modes.get(0).label;

    }



    private static CastMode castModeAt(java.util.List<CastOptionLists.Option> modes, int position) {

        if (position < 0 || position >= modes.size()) {

            return CastMode.MIRROR;

        }

        return CastMode.fromId(modes.get(position).value);

    }



    private void applyMultiAppModeLayout() {

        boolean multiApp = castMode == CastMode.MULTI_APP;

        View tabs = findViewById(R.id.settingsTabs);

        View pager = findViewById(R.id.settingsPager);

        View hint = findViewById(R.id.textMultiAppHint);

        View layoutCastMode = findViewById(R.id.layoutCastMode);

        int visibility = multiApp ? View.GONE : View.VISIBLE;

        if (tabs != null) {

            tabs.setVisibility(visibility);

        }

        if (pager != null) {

            pager.setVisibility(visibility);

        }

        if (hint != null) {

            hint.setVisibility(View.GONE);

        }

        if (layoutCastMode != null) {

            layoutCastMode.setVisibility(visibility);

        }

        if (textHint != null) {

            textHint.setVisibility(multiApp ? View.GONE : View.VISIBLE);

            if (!multiApp) {

                textHint.setText(getString(R.string.workspace_settings_hint));

            }

        }

        if (buttonStartCast != null) {

            buttonStartCast.setVisibility(multiApp ? View.GONE : View.VISIBLE);

        }

        if (inputCastModeHeader != null) {

            inputCastModeHeader.setVisibility(multiApp ? View.VISIBLE : View.GONE);

        }

        if (castToolbarDock != null) {

            castToolbarDock.setVisibility(multiApp ? View.GONE : (castActive ? View.VISIBLE : View.GONE));

        }

        updateMultiAppCanvasLayout(multiApp);

    }



    private void updateMultiAppCanvasLayout(boolean multiApp) {
        ConstraintLayout root = findViewById(R.id.deviceWorkspaceRoot);
        if (root == null) {
            return;
        }
        boolean landscape = getResources().getConfiguration().orientation
                == Configuration.ORIENTATION_LANDSCAPE;
        float density = getResources().getDisplayMetrics().density;
        int margin = Math.round(8 * density);

        Guideline guideline = findViewById(R.id.guidelineSplit);
        if (guideline != null) {
            ConstraintLayout.LayoutParams glp =
                    (ConstraintLayout.LayoutParams) guideline.getLayoutParams();
            glp.orientation = landscape
                    ? ConstraintLayout.LayoutParams.VERTICAL
                    : ConstraintLayout.LayoutParams.HORIZONTAL;
            guideline.setLayoutParams(glp);
            guideline.setGuidelinePercent(landscape ? 0.42f : 0.48f);
        }

        ConstraintSet set = new ConstraintSet();
        set.clone(root);
        set.clear(R.id.leftPane, ConstraintSet.START);
        set.clear(R.id.leftPane, ConstraintSet.END);
        set.clear(R.id.leftPane, ConstraintSet.TOP);
        set.clear(R.id.leftPane, ConstraintSet.BOTTOM);
        set.clear(R.id.castViewportHost, ConstraintSet.START);
        set.clear(R.id.castViewportHost, ConstraintSet.END);
        set.clear(R.id.castViewportHost, ConstraintSet.TOP);
        set.clear(R.id.castViewportHost, ConstraintSet.BOTTOM);

        if (multiApp) {
            if (leftPane != null) {
                leftPane.setVisibility(View.GONE);
            }
            set.connect(R.id.castViewportHost, ConstraintSet.START, ConstraintSet.PARENT_ID, ConstraintSet.START, margin);
            set.connect(R.id.castViewportHost, ConstraintSet.END, ConstraintSet.PARENT_ID, ConstraintSet.END, margin);
            set.connect(R.id.castViewportHost, ConstraintSet.TOP, R.id.castToolbarDock, ConstraintSet.BOTTOM, Math.round(4 * density));
            set.connect(R.id.castViewportHost, ConstraintSet.BOTTOM, ConstraintSet.PARENT_ID, ConstraintSet.BOTTOM, margin);
            if (castViewportRoot != null) {
                castViewportRoot.setVisibility(View.GONE);
            }
            if (castViewport.isCasting()) {
                castViewport.stopCast();
            }
            if (multiAppDesktop != null && deviceConnected) {
                multiAppDesktop.show();
            }
            if (castViewportHost != null) {
                castViewportHost.setBackground(null);
            }
        } else {
            if (leftPane != null) {
                leftPane.setVisibility(View.VISIBLE);
            }
            if (landscape) {
                set.connect(R.id.leftPane, ConstraintSet.START, ConstraintSet.PARENT_ID, ConstraintSet.START);
                set.connect(R.id.leftPane, ConstraintSet.END, R.id.guidelineSplit, ConstraintSet.START);
                set.connect(R.id.leftPane, ConstraintSet.TOP, R.id.castToolbarDock, ConstraintSet.BOTTOM);
                set.connect(R.id.leftPane, ConstraintSet.BOTTOM, ConstraintSet.PARENT_ID, ConstraintSet.BOTTOM);
                set.connect(R.id.castViewportHost, ConstraintSet.START, R.id.guidelineSplit, ConstraintSet.END, 0);
                set.connect(R.id.castViewportHost, ConstraintSet.END, ConstraintSet.PARENT_ID, ConstraintSet.END, margin);
                set.connect(R.id.castViewportHost, ConstraintSet.TOP, R.id.castToolbarDock, ConstraintSet.BOTTOM, margin);
                set.connect(R.id.castViewportHost, ConstraintSet.BOTTOM, ConstraintSet.PARENT_ID, ConstraintSet.BOTTOM, margin);
            } else {
                set.connect(R.id.leftPane, ConstraintSet.START, ConstraintSet.PARENT_ID, ConstraintSet.START);
                set.connect(R.id.leftPane, ConstraintSet.END, ConstraintSet.PARENT_ID, ConstraintSet.END);
                set.connect(R.id.leftPane, ConstraintSet.TOP, R.id.castToolbarDock, ConstraintSet.BOTTOM);
                set.connect(R.id.leftPane, ConstraintSet.BOTTOM, R.id.guidelineSplit, ConstraintSet.TOP);
                set.connect(R.id.castViewportHost, ConstraintSet.START, ConstraintSet.PARENT_ID, ConstraintSet.START, margin);
                set.connect(R.id.castViewportHost, ConstraintSet.END, ConstraintSet.PARENT_ID, ConstraintSet.END, margin);
                set.connect(R.id.castViewportHost, ConstraintSet.TOP, R.id.guidelineSplit, ConstraintSet.BOTTOM, Math.round(4 * density));
                set.connect(R.id.castViewportHost, ConstraintSet.BOTTOM, ConstraintSet.PARENT_ID, ConstraintSet.BOTTOM, margin);
            }
            if (castViewportRoot != null) {
                castViewportRoot.setVisibility(View.VISIBLE);
            }
            if (multiAppDesktop != null) {
                multiAppDesktop.hide();
            }
            if (castViewportHost != null) {
                castViewportHost.setBackgroundColor(getColor(R.color.auth_preview_bg));
            }
        }
        set.constrainWidth(R.id.leftPane, ConstraintSet.MATCH_CONSTRAINT);
        set.constrainHeight(R.id.leftPane, ConstraintSet.MATCH_CONSTRAINT);
        set.constrainWidth(R.id.castViewportHost, ConstraintSet.MATCH_CONSTRAINT);
        set.constrainHeight(R.id.castViewportHost, ConstraintSet.MATCH_CONSTRAINT);
        set.applyTo(root);
    }

    @Override
    public void onConfigurationChanged(@NonNull Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applyMultiAppModeLayout();
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

        } else if (castMode == CastMode.MULTI_APP) {

            pagerAdapter.setEmptyTabs();

        } else {

            pagerAdapter.setMirrorTabs();

        }

        pager.setAdapter(pagerAdapter);

        pager.setCurrentItem(0, false);

        if (tabMediator != null) {

            tabMediator.detach();

        }

        if (pagerAdapter.getItemCount() > 0) {

            tabMediator = new TabLayoutMediator(tabs, pager, (tab, position) -> {

                tab.setText(pagerAdapter.tabTitle(position));

            });

            tabMediator.attach();

        }

        applyMultiAppModeLayout();

    }



    private void updateHint() {

        if (!deviceConnected) {

            textHint.setText(R.string.workspace_offline_hint);

            return;

        }

        if (castMode == CastMode.MULTI_APP) {

            textHint.setText(R.string.workspace_multi_app_hint);

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

        java.util.List<CastOptionLists.Option> modes = CastOptionLists.castModes();

        String label = castModeLabel(modes, castMode);

        if (inputCastMode != null) {

            inputCastMode.setText(label, false);

        }

        if (inputCastModeHeader != null) {

            inputCastModeHeader.setText(label, false);

        }

        ViewPager2 pager = findViewById(R.id.settingsPager);

        TabLayout tabs = findViewById(R.id.settingsTabs);

        applyCastModeTabs(pager, tabs);

        updateHint();

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

        if (multiAppDesktop != null) {

            multiAppDesktop.release();

        }

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


