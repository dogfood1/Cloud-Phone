package com.yiyi.cloud_phone.cast;

import android.content.Context;
import android.view.View;

import com.yiyi.cloud_phone.workspace.CastMode;

import org.json.JSONObject;

public final class CastWorkspaceLaunch {
    public interface Callback {
        void onBackendReady(org.json.JSONObject session, byte[] streamParams);

        void onError(String message);
    }

    private CastWorkspaceLaunch() {
    }

    public static CastLaunchOverlay bindOverlay(View root) {
        return new CastLaunchOverlay(root);
    }

    public static void startBackend(
            Context context,
            String serial,
            CastMode mode,
            JSONObject settings,
            int deviceSdk,
            Callback callback
    ) {
        CastConnectCoordinator.startBackend(
                context,
                CastServerConfig.host(context),
                CastServerConfig.port(context),
                serial,
                mode,
                settings,
                deviceSdk,
                new CastConnectCoordinator.Host() {
                    @Override
                    public void onBackendStarted(org.json.JSONObject session, byte[] streamParams) {
                        callback.onBackendReady(session, streamParams);
                    }

                    @Override
                    public void onWebSocketOpen() {
                        // no-op
                    }

                    @Override
                    public void onInitialInfo() {
                        // no-op
                    }

                    @Override
                    public void onStreamError(String message) {
                        callback.onError(message);
                    }
                }
        );
    }

    public static void stopBackend(Context context, String serial) {
        CastSessionController.stop(
                context,
                CastServerConfig.host(context),
                CastServerConfig.port(context),
                serial
        );
    }
}
