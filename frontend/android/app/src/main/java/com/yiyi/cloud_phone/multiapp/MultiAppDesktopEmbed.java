package com.yiyi.cloud_phone.multiapp;

import android.os.Handler;
import android.os.Looper;
import android.view.View;

import androidx.appcompat.app.AppCompatActivity;

import com.yiyi.cloud_phone.R;

public final class MultiAppDesktopEmbed implements MultiAppDesktopController.Host {
    public interface Callback {
        void onSwitchMirror();

        void onOpenFullscreen();
    }

    private final AppCompatActivity activity;
    private final String serial;
    private final int deviceSdk;
    private final Callback callback;
    private final Handler clockHandler = new Handler(Looper.getMainLooper());
    private final Runnable clockTick = new Runnable() {
        @Override
        public void run() {
            if (controller != null) {
                controller.onClockTick();
            }
            if (active) {
                clockHandler.postDelayed(this, 1000L);
            }
        }
    };

    private View root;
    private MultiAppDesktopController controller;
    private boolean active;

    public MultiAppDesktopEmbed(AppCompatActivity activity, String serial, int deviceSdk, Callback callback) {
        this.activity = activity;
        this.serial = serial;
        this.deviceSdk = deviceSdk;
        this.callback = callback;
    }

    public void attach(View embedRoot) {
        this.root = embedRoot;
    }

    public void show() {
        if (root == null) {
            return;
        }
        if (controller == null) {
            controller = new MultiAppDesktopController(activity, this, serial, deviceSdk);
            controller.bind(root);
        }
        root.setVisibility(View.VISIBLE);
        if (!active) {
            active = true;
            clockHandler.post(clockTick);
        }
    }

    public void hide() {
        active = false;
        clockHandler.removeCallbacks(clockTick);
        if (root != null) {
            root.setVisibility(View.GONE);
        }
        if (controller != null) {
            controller.release();
            controller = null;
        }
    }

    public void release() {
        hide();
        root = null;
    }

    @Override
    public void onExitDesktop() {
        hide();
    }

    @Override
    public void onSwitchMirror() {
        hide();
        if (callback != null) {
            callback.onSwitchMirror();
        }
    }

    @Override
    public void onToggleFullscreen() {
        hide();
        if (callback != null) {
            callback.onOpenFullscreen();
        }
    }
}
