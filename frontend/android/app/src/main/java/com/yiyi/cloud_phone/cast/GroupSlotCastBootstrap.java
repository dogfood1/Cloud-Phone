package com.yiyi.cloud_phone.cast;

import android.content.Context;
import android.os.Handler;

import com.yiyi.cloud_phone.DeviceCastApi;
import com.yiyi.cloud_phone.workspace.CastMode;
import com.yiyi.cloud_phone.workspace.GroupCastOptions;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;

import okhttp3.OkHttpClient;

/** Starts backend cast and polls startup logs for a group slot. */
final class GroupSlotCastBootstrap {
    interface Sink {
        void onBackendReady(byte[] streamParams, int logConsumed);

        void onError(String message);

        void appendLog(String message);

        void pushUi();

        int ingestLogs(JSONArray logs, int from);

        void maybeConnect();
    }

    private final Context context;
    private final String serial;
    private final int deviceSdk;
    private final Handler mainHandler;
    private final AtomicBoolean released;
    private final BooleanSupplier started;
    private final Sink sink;
    private Runnable logPollRunnable;
    private boolean showLogs = true;
    private int logPollConsumed;

    GroupSlotCastBootstrap(
            Context context,
            String serial,
            int deviceSdk,
            Handler mainHandler,
            AtomicBoolean released,
            BooleanSupplier started,
            Sink sink
    ) {
        this.context = context;
        this.serial = serial;
        this.deviceSdk = deviceSdk;
        this.mainHandler = mainHandler;
        this.released = released;
        this.started = started;
        this.sink = sink;
    }

    void requestStart() {
        showLogs = true;
        logPollConsumed = 0;
        sink.appendLog("正在请求后端启动投屏…");
        GroupCastStartGate.acquire(slot -> new Thread(() -> {
            try {
                if (released.get() || !started.getAsBoolean()) {
                    return;
                }
                JSONObject settings = GroupCastOptions.buildSettings();
                JSONObject payload = CastPayloadBuilder.build(CastMode.MIRROR, settings, deviceSdk);
                payload.put("audio", false);
                payload.put("maxSize", GroupCastOptions.TARGET_MAX_SIZE);
                JSONObject session = DeviceCastApi.startCast(
                        context,
                        CastServerConfig.host(context),
                        CastServerConfig.port(context),
                        serial,
                        payload
                );
                if (!session.optBoolean("success", false)) {
                    throw new Exception(session.optString("message", "cast_start_failed"));
                }
                byte[] streamParams = CastPayloadBuilder.streamParamsFromPayload(payload);
                JSONArray logs = session.optJSONArray("startupLogs");
                int consumed = logs == null ? 0 : logs.length();
                mainHandler.post(() -> {
                    logPollConsumed = sink.ingestLogs(logs, 0);
                    if (logPollConsumed < consumed) {
                        logPollConsumed = consumed;
                    }
                    sink.appendLog("前端：scrcpy 启动成功");
                    sink.appendLog("正在连接 WebSocket 视频流…");
                    sink.onBackendReady(streamParams, logPollConsumed);
                    startLogPolling();
                    sink.maybeConnect();
                });
            } catch (Exception error) {
                String message = error.getMessage() == null ? "cast_start_failed" : error.getMessage();
                mainHandler.post(() -> sink.onError(message));
            } finally {
                slot.release();
            }
        }, "group-cast-start").start());
    }

    void openStream(OkHttpClient httpClient, CastWebSocketSession webSocket, byte[] streamParams,
                    BooleanSupplier stillActive, Consumer<String> onError) {
        CastConnectCoordinator.openStream(
                httpClient,
                webSocket,
                CastServerConfig.host(context),
                CastServerConfig.port(context),
                serial,
                streamParams,
                new CastConnectCoordinator.Host() {
                    @Override
                    public void onBackendStarted(JSONObject sessionPayload, byte[] params) {
                    }

                    @Override
                    public void onWebSocketOpen() {
                        mainHandler.post(() -> sink.appendLog("WebSocket 已连接"));
                    }

                    @Override
                    public void onInitialInfo() {
                        mainHandler.post(() -> sink.appendLog("收到初始流信息"));
                    }

                    @Override
                    public void onStreamError(String message) {
                        mainHandler.post(() -> {
                            if (!stillActive.getAsBoolean()) {
                                return;
                            }
                            onError.accept(message == null ? "stream_error" : message);
                        });
                    }
                }
        );
    }

    void hideLogs() {
        showLogs = false;
        stopLogPolling();
        sink.pushUi();
    }

    boolean showingLogs() {
        return showLogs;
    }

    void stopLogPolling() {
        if (logPollRunnable != null) {
            mainHandler.removeCallbacks(logPollRunnable);
            logPollRunnable = null;
        }
    }

    private void startLogPolling() {
        stopLogPolling();
        logPollRunnable = new Runnable() {
            @Override
            public void run() {
                if (!started.getAsBoolean() || !showLogs || released.get()) {
                    return;
                }
                new Thread(() -> {
                    try {
                        JSONObject status = DeviceCastApi.getCastStatus(
                                context,
                                CastServerConfig.host(context),
                                CastServerConfig.port(context),
                                serial
                        );
                        JSONArray logs = status.optJSONArray("startupLogs");
                        mainHandler.post(() -> {
                            logPollConsumed = sink.ingestLogs(logs, logPollConsumed);
                            sink.pushUi();
                        });
                    } catch (Exception ignored) {
                    }
                    mainHandler.postDelayed(this, 600);
                }, "group-cast-log").start();
            }
        };
        mainHandler.post(logPollRunnable);
    }
}
