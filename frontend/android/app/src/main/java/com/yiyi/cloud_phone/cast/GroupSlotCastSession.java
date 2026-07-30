package com.yiyi.cloud_phone.cast;

import android.content.Context;
import android.graphics.SurfaceTexture;
import android.os.Handler;
import android.os.Looper;
import android.view.Surface;
import android.view.TextureView;

import com.yiyi.cloud_phone.DeviceCastApi;
import com.yiyi.cloud_phone.workspace.CastMode;
import com.yiyi.cloud_phone.workspace.GroupCastOptions;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.CookieHandler;
import java.net.CookieManager;
import java.util.concurrent.atomic.AtomicBoolean;

import okhttp3.JavaNetCookieJar;
import okhttp3.OkHttpClient;

public final class GroupSlotCastSession {
    public static final String STATE_IDLE = "idle";
    public static final String STATE_STARTING = "starting";
    public static final String STATE_STREAMING = "streaming";
    public static final String STATE_ERROR = "error";

    public interface UiCallback {
        void onUiChanged(String state, String logText, String error, boolean showLogs);
    }

    private final Context context;
    private final String serial;
    private final int deviceSdk;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final AnnexBH264Decoder decoder = new AnnexBH264Decoder();
    private final CastWebSocketSession webSocketSession = new CastWebSocketSession(decoder);
    private final GroupStartupLogBuffer startupLog = new GroupStartupLogBuffer();
    private final AtomicBoolean released = new AtomicBoolean(false);
    private final OkHttpClient httpClient;

    private TextureView textureView;
    private UiCallback callback;
    private boolean surfaceReady;
    private boolean started;
    private boolean backendHeld;
    private byte[] streamParams;
    private int logPollConsumed;
    private Runnable logPollRunnable;
    private String state = STATE_IDLE;
    private String errorMessage = "";
    private boolean showLogs;

    public GroupSlotCastSession(Context context, String serial, int deviceSdk) {
        this.context = context.getApplicationContext();
        this.serial = serial;
        this.deviceSdk = deviceSdk;
        CookieHandler handler = CookieHandler.getDefault();
        OkHttpClient.Builder builder = new OkHttpClient.Builder();
        if (handler instanceof CookieManager) {
            builder.cookieJar(new JavaNetCookieJar((CookieManager) handler));
        }
        httpClient = builder.build();
        decoder.setListener(new AnnexBH264Decoder.Listener() {
            @Override
            public void onVideoFrameSize(int width, int height) {
            }

            @Override
            public void onFrameRendered() {
                mainHandler.post(() -> {
                    if (!STATE_STREAMING.equals(state)) {
                        setState(STATE_STREAMING, "");
                        hideLogs();
                        appendLog("视频帧已就绪");
                    }
                });
            }
        });
    }

    public void setUiCallback(UiCallback callback) {
        this.callback = callback;
        pushUi();
    }

    public void bindTexture(TextureView view) {
        if (textureView == view) {
            return;
        }
        unbindTexture(textureView);
        textureView = view;
        if (view == null) {
            return;
        }
        view.setSurfaceTextureListener(new TextureView.SurfaceTextureListener() {
            @Override
            public void onSurfaceTextureAvailable(SurfaceTexture surface, int w, int h) {
                surfaceReady = true;
                decoder.attachSurface(new Surface(surface), surface);
                maybeConnect();
            }

            @Override
            public void onSurfaceTextureSizeChanged(SurfaceTexture surface, int w, int h) {
            }

            @Override
            public boolean onSurfaceTextureDestroyed(SurfaceTexture surface) {
                surfaceReady = false;
                decoder.attachSurface(null, null);
                return true;
            }

            @Override
            public void onSurfaceTextureUpdated(SurfaceTexture surface) {
            }
        });
        if (view.isAvailable()) {
            surfaceReady = true;
            decoder.attachSurface(new Surface(view.getSurfaceTexture()), view.getSurfaceTexture());
            maybeConnect();
        }
    }

    public void unbindTexture(TextureView view) {
        if (view == null || textureView != view) {
            return;
        }
        textureView = null;
        surfaceReady = false;
        decoder.attachSurface(null, null);
    }

    public void start() {
        if (started || released.get()) {
            return;
        }
        started = true;
        showLogs = true;
        startupLog.reset();
        setState(STATE_STARTING, "");
        appendLog("正在请求后端启动投屏…");
        GroupCastStartGate.acquire(slot -> new Thread(() -> {
            try {
                if (released.get() || !started) {
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
                backendHeld = true;
                streamParams = CastPayloadBuilder.streamParamsFromPayload(payload);
                JSONArray logs = session.optJSONArray("startupLogs");
                int consumed = logs == null ? 0 : logs.length();
                mainHandler.post(() -> {
                    logPollConsumed = startupLog.ingest(logs, 0);
                    if (logPollConsumed < consumed) {
                        logPollConsumed = consumed;
                    }
                    appendLog("前端：scrcpy 启动成功");
                    appendLog("正在连接 WebSocket 视频流…");
                    startLogPolling();
                    maybeConnect();
                });
            } catch (Exception error) {
                String message = error.getMessage() == null ? "cast_start_failed" : error.getMessage();
                mainHandler.post(() -> {
                    appendLog(message);
                    setState(STATE_ERROR, message);
                });
            } finally {
                slot.release();
            }
        }, "group-cast-start").start());
    }

    public void stop(boolean releaseBackend) {
        started = false;
        stopLogPolling();
        webSocketSession.close();
        streamParams = null;
        if (releaseBackend && backendHeld) {
            backendHeld = false;
            CastSessionController.stop(
                    context,
                    CastServerConfig.host(context),
                    CastServerConfig.port(context),
                    serial
            );
        }
        showLogs = false;
        setState(STATE_IDLE, "");
    }

    public void release() {
        released.set(true);
        stop(true);
        unbindTexture(textureView);
        decoder.release();
        callback = null;
    }

    public void sendNavigation(String actionId) {
        if (actionId == null) {
            return;
        }
        if ("screen-on".equals(actionId)) {
            webSocketSession.sendControl(ScrcpyControlWire.setScreenPower(true));
            byte[] wake = ScrcpyControlWire.navigationTap("power");
            if (wake != null) {
                webSocketSession.sendControl(wake);
            }
            return;
        }
        if ("screen-off".equals(actionId)) {
            webSocketSession.sendControl(ScrcpyControlWire.setScreenPower(false));
            return;
        }
        byte[] payload = ScrcpyControlWire.navigationTap(actionId);
        if (payload != null) {
            webSocketSession.sendControl(payload);
        }
    }

    private void maybeConnect() {
        if (!surfaceReady || streamParams == null || !started || released.get()) {
            return;
        }
        CastConnectCoordinator.openStream(
                httpClient,
                webSocketSession,
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
                        mainHandler.post(() -> appendLog("WebSocket 已连接"));
                    }

                    @Override
                    public void onInitialInfo() {
                        mainHandler.post(() -> appendLog("收到初始流信息"));
                    }

                    @Override
                    public void onStreamError(String message) {
                        mainHandler.post(() -> {
                            if (!started) {
                                return;
                            }
                            appendLog(message == null ? "stream_error" : message);
                            setState(STATE_ERROR, message);
                        });
                    }
                }
        );
    }

    private void startLogPolling() {
        stopLogPolling();
        logPollRunnable = new Runnable() {
            @Override
            public void run() {
                if (!started || !showLogs || released.get()) {
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
                            logPollConsumed = startupLog.ingest(logs, logPollConsumed);
                            pushUi();
                        });
                    } catch (Exception ignored) {
                    }
                    mainHandler.postDelayed(this, 600);
                }, "group-cast-log").start();
            }
        };
        mainHandler.post(logPollRunnable);
    }

    private void stopLogPolling() {
        if (logPollRunnable != null) {
            mainHandler.removeCallbacks(logPollRunnable);
            logPollRunnable = null;
        }
    }

    private void hideLogs() {
        showLogs = false;
        stopLogPolling();
        pushUi();
    }

    private void appendLog(String message) {
        startupLog.append(message);
        pushUi();
    }

    private void setState(String next, String error) {
        state = next;
        errorMessage = error == null ? "" : error;
        pushUi();
    }

    private void pushUi() {
        if (callback != null) {
            callback.onUiChanged(state, startupLog.text(), errorMessage, showLogs);
        }
    }
}
