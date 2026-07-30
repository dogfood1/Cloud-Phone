package com.yiyi.cloud_phone.multiapp;



import android.content.Context;

import android.content.Intent;

import android.os.Bundle;

import android.os.Handler;

import android.os.Looper;



import androidx.appcompat.app.AppCompatActivity;



import com.yiyi.cloud_phone.DeviceWorkspaceActivity;

import com.yiyi.cloud_phone.R;



public class MultiAppDesktopActivity extends AppCompatActivity implements MultiAppDesktopController.Host {

    public static final String EXTRA_SERIAL = DeviceWorkspaceActivity.EXTRA_SERIAL;

    public static final String EXTRA_DISPLAY_NAME = DeviceWorkspaceActivity.EXTRA_DISPLAY_NAME;

    public static final String EXTRA_SDK = DeviceWorkspaceActivity.EXTRA_SDK;

    public static final int RESULT_SWITCH_MIRROR = 2;



    private final Handler clockHandler = new Handler(Looper.getMainLooper());

    private MultiAppDesktopController controller;

    private final Runnable clockTick = new Runnable() {

        @Override

        public void run() {

            if (controller != null) {

                controller.onClockTick();

            }

            clockHandler.postDelayed(this, 1000L);

        }

    };



    public static void open(Context context, String serial, String displayName, int deviceSdk) {

        Intent intent = new Intent(context, MultiAppDesktopActivity.class);

        intent.putExtra(EXTRA_SERIAL, serial);

        intent.putExtra(EXTRA_DISPLAY_NAME, displayName);

        intent.putExtra(EXTRA_SDK, deviceSdk);

        context.startActivity(intent);

    }



    @Override

    protected void onCreate(Bundle savedInstanceState) {

        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_multi_app_desktop);

        String serial = getIntent().getStringExtra(EXTRA_SERIAL);

        if (serial == null) {

            serial = "";

        }

        int deviceSdk = getIntent().getIntExtra(EXTRA_SDK, 0);

        String title = getIntent().getStringExtra(EXTRA_DISPLAY_NAME);

        if (title != null && !title.isEmpty()) {

            setTitle(title);

        }

        controller = new MultiAppDesktopController(this, this, serial, deviceSdk);

        controller.bind(findViewById(R.id.multiAppRoot));

        clockHandler.post(clockTick);

    }



    @Override

    protected void onDestroy() {

        clockHandler.removeCallbacks(clockTick);

        if (controller != null) {

            controller.release();

        }

        super.onDestroy();

    }



    @Override

    public void onBackPressed() {

        if (controller != null) {

            controller.exitDesktop();

            return;

        }

        super.onBackPressed();

    }



    @Override

    public void onExitDesktop() {

        finish();

    }



    @Override

    public void onSwitchMirror() {

        setResult(RESULT_SWITCH_MIRROR);

        finish();

    }

    @Override
    public void onToggleFullscreen() {
        finish();
    }

    @Override
    public boolean isFullscreenDesktop() {
        return true;
    }

}

