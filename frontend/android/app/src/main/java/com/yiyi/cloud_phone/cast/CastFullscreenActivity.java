package com.yiyi.cloud_phone.cast;



import android.content.Context;

import android.content.Intent;

import android.content.res.Configuration;

import android.os.Bundle;

import android.view.View;

import android.widget.HorizontalScrollView;

import android.widget.ImageButton;

import android.widget.LinearLayout;



import androidx.annotation.Nullable;

import androidx.appcompat.app.AppCompatActivity;



import com.yiyi.cloud_phone.DeviceWorkspaceActivity;

import com.yiyi.cloud_phone.R;

import com.yiyi.cloud_phone.workspace.CastMode;

import com.yiyi.cloud_phone.workspace.CastSettingsStore;



import org.json.JSONArray;

import org.json.JSONObject;



public class CastFullscreenActivity extends AppCompatActivity {

    public static final String EXTRA_SERIAL = DeviceWorkspaceActivity.EXTRA_SERIAL;

    public static final String EXTRA_DISPLAY_NAME = DeviceWorkspaceActivity.EXTRA_DISPLAY_NAME;

    public static final String EXTRA_SDK = DeviceWorkspaceActivity.EXTRA_SDK;

    public static final String EXTRA_CAST_MODE = "cast_mode";

    public static final String EXTRA_STREAM_PARAMS = "cast_stream_params";

    public static final String EXTRA_BACKEND_READY = "cast_backend_ready";

    public static final String EXTRA_STARTUP_LOGS = "cast_startup_logs";



    private String deviceSerial = "";

    private int deviceSdk;

    private CastMode castMode = CastMode.MIRROR;

    private JSONObject settings;

    private final CastViewportController castViewport = new CastViewportController();

    private View toolbarDock;



    public static void open(

            Context context,

            String serial,

            String displayName,

            int deviceSdk,

            CastMode mode

    ) {

        open(context, serial, displayName, deviceSdk, mode, null, null);

    }



    public static void open(

            Context context,

            String serial,

            String displayName,

            int deviceSdk,

            CastMode mode,

            byte[] streamParams,

            JSONArray startupLogs

    ) {

        Intent intent = new Intent(context, CastFullscreenActivity.class);

        intent.putExtra(EXTRA_SERIAL, serial);

        intent.putExtra(EXTRA_DISPLAY_NAME, displayName);

        intent.putExtra(EXTRA_SDK, deviceSdk);

        intent.putExtra(EXTRA_CAST_MODE, mode.name());

        if (streamParams != null) {

            intent.putExtra(EXTRA_BACKEND_READY, true);

            intent.putExtra(EXTRA_STREAM_PARAMS, streamParams);

        }

        if (startupLogs != null) {

            intent.putExtra(EXTRA_STARTUP_LOGS, startupLogs.toString());

        }

        if (context instanceof android.app.Activity) {

            CastMotion.openCast((android.app.Activity) context, intent);

        } else {

            context.startActivity(intent);

        }

    }



    @Override

    protected void onCreate(@Nullable Bundle savedInstanceState) {

        super.onCreate(savedInstanceState);

        CastFullscreenUi.apply(this);

        setContentView(R.layout.activity_cast_fullscreen);

        readExtras();

        loadSettings();



        toolbarDock = findViewById(R.id.castToolbarDock);

        castViewport.bind(findViewById(R.id.castViewportRoot), new CastViewportController.Host() {

            @Override

            public AppCompatActivity activity() {

                return CastFullscreenActivity.this;

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

                return settings;

            }



            @Override

            public void onCastActiveChanged(boolean active) {

                toolbarDock.setVisibility(active ? View.VISIBLE : View.GONE);

            }



            @Override

            public void onCastFailed(String message) {
                toolbarDock.setVisibility(View.VISIBLE);
                findViewById(R.id.castErrorClose).setVisibility(View.VISIBLE);
            }
        }, false);

        castViewport.attachToolbar(findViewById(R.id.castToolbar), new CastInteractionController.ToolbarHandler() {
            @Override
            public void onStopRequested() {
                stopCastAndFinish();
            }

            @Override
            public void onRotateRequested() {
                castViewport.rotatePreview();
            }
        });
        new CastToolbarController(
                findViewById(R.id.castToolbarScroll),
                findViewById(R.id.castToolbarToggle)
        );



        findViewById(R.id.castErrorClose).setOnClickListener(v -> stopCastAndFinish());



        Intent intent = getIntent();

        if (intent.getBooleanExtra(EXTRA_BACKEND_READY, false)) {

            JSONArray logs = parseLogs(intent.getStringExtra(EXTRA_STARTUP_LOGS));

            castViewport.beginWithBackend(intent.getByteArrayExtra(EXTRA_STREAM_PARAMS), logs);

        } else {

            castViewport.beginCast();

        }

    }



    private void readExtras() {

        Intent intent = getIntent();

        deviceSerial = intent.getStringExtra(EXTRA_SERIAL);

        if (deviceSerial == null) {

            deviceSerial = "";

        }

        deviceSdk = intent.getIntExtra(EXTRA_SDK, 0);

        String modeRaw = intent.getStringExtra(EXTRA_CAST_MODE);

        castMode = CastMode.CAMERA.name().equals(modeRaw) ? CastMode.CAMERA : CastMode.MIRROR;

    }



    private void loadSettings() {

        if (castMode == CastMode.CAMERA) {

            settings = CastSettingsStore.loadCamera(this, deviceSerial);

        } else {

            settings = CastSettingsStore.loadMirror(this, deviceSerial);

        }

    }



    private JSONArray parseLogs(String raw) {

        if (raw == null || raw.isEmpty()) {

            return new JSONArray();

        }

        try {

            return new JSONArray(raw);

        } catch (Exception error) {

            return new JSONArray();

        }

    }



    private void stopCastAndFinish() {

        castViewport.stopCast();

        CastMotion.closeCast(this);

    }



    @Override

    public void onConfigurationChanged(Configuration newConfig) {

        super.onConfigurationChanged(newConfig);

        castViewport.onConfigurationChanged();

    }



    @Override

    public void onBackPressed() {

        stopCastAndFinish();

    }



    @Override
    protected void onDestroy() {
        castViewport.release();
        super.onDestroy();
    }
}
