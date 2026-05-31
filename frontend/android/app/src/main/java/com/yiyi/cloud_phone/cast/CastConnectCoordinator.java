package com.yiyi.cloud_phone.cast;

import android.content.Context;

import com.yiyi.cloud_phone.workspace.CastMode;

import org.json.JSONObject;

import okhttp3.OkHttpClient;

final class CastConnectCoordinator {
    interface Host {
        void onBackendStarted(org.json.JSONObject session, byte[] streamParams);

        void onWebSocketOpen();

        void onInitialInfo();

        void onStreamError(String message);
    }

    private CastConnectCoordinator() {
    }

    static void startBackend(
            Context context,
            String host,
            int port,
            String serial,
            CastMode mode,
            JSONObject settings,
            int deviceSdk,
            Host hostCallback
    ) {
        CastSessionController.start(
                context,
                host,
                port,
                serial,
                mode,
                settings,
                deviceSdk,
                new CastSessionController.Callback() {
                    @Override
                    public void onCastStarted(JSONObject sessionPayload, byte[] streamParams) {
                        hostCallback.onBackendStarted(sessionPayload, streamParams);
                    }

                    @Override
                    public void onError(String message) {
                        hostCallback.onStreamError(message);
                    }
                }
        );
    }

    static void openStream(
            OkHttpClient client,
            CastWebSocketSession session,
            String host,
            int port,
            String serial,
            byte[] streamParams,
            Host hostCallback
    ) {
        String url = CastWebSocketSession.buildUrl(host, port, serial);
        session.connect(client, host, port, url, streamParams, new CastWebSocketSession.Listener() {
            @Override
            public void onOpen() {
                hostCallback.onWebSocketOpen();
            }

            @Override
            public void onStreamReady() {
                hostCallback.onInitialInfo();
            }

            @Override
            public void onClosed(String reason) {
                hostCallback.onStreamError(reason == null ? "closed" : reason);
            }

            @Override
            public void onFailure(String message) {
                hostCallback.onStreamError(message);
            }
        });
    }
}
