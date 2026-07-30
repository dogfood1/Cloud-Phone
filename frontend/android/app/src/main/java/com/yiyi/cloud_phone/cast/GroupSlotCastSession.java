package com.yiyi.cloud_phone.cast;

import android.content.Context;
import android.graphics.SurfaceTexture;
import android.os.Handler;
import android.os.Looper;
import android.view.Surface;
import android.view.TextureView;

import org.json.JSONArray;

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

    public interface ControlRelay {
        void onControlSent(String serial, byte[] payload, int videoWidth, int videoHeight);
    }

    private final Context context;
    private final String serial;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final AnnexBH264Decoder decoder = new AnnexBH264Decoder();
    private final CastWebSocketSession webSocketSession = new CastWebSocketSession(decoder);
    private final GroupStartupLogBuffer startupLog = new GroupStartupLogBuffer();
    private final AtomicBoolean released = new AtomicBoolean(false);
    private final OkHttpClient httpClient;
    private final GroupSlotCastBootstrap bootstrap;

    private TextureView textureView;
    private UiCallback callback;
    private boolean surfaceReady;
    private boolean started;
    private boolean backendHeld;
    private byte[] streamParams;
    private String state = STATE_IDLE;
    private String errorMessage = "";
    private int videoWidth;
    private int videoHeight;
    private ControlRelay controlRelay;

    public GroupSlotCastSession(Context context, String serial, int deviceSdk) {
        this.context = context.getApplicationContext();
        this.serial = serial;
        CookieHandler handler = CookieHandler.getDefault();
        OkHttpClient.Builder builder = new OkHttpClient.Builder();
        if (handler instanceof CookieManager) {
            builder.cookieJar(new JavaNetCookieJar((CookieManager) handler));
        }
        httpClient = builder.build();
        bootstrap = new GroupSlotCastBootstrap(
                this.context, serial, deviceSdk, mainHandler, released, () -> started, sink());
        decoder.setListener(new AnnexBH264Decoder.Listener() {
            @Override
            public void onVideoFrameSize(int width, int height) {
                mainHandler.post(() -> {
                    videoWidth = width;
                    videoHeight = height;
                    applyLetterbox();
                });
            }

            @Override
            public void onFrameRendered() {
                mainHandler.post(() -> {
                    if (!STATE_STREAMING.equals(state)) {
                        setState(STATE_STREAMING, "");
                        bootstrap.hideLogs();
                        appendLog("视频帧已就绪");
                    }
                    applyLetterbox();
                });
            }
        });
    }

    public void setUiCallback(UiCallback callback) {
        this.callback = callback;
        pushUi();
    }

    public void setControlRelay(ControlRelay controlRelay) {
        this.controlRelay = controlRelay;
    }

    public boolean isStreaming() {
        return STATE_STREAMING.equals(state);
    }

    public boolean isStarted() {
        return started && !released.get();
    }

    public int getVideoWidth() {
        return videoWidth > 0 ? videoWidth : decoder.getVideoWidth();
    }

    public int getVideoHeight() {
        return videoHeight > 0 ? videoHeight : decoder.getVideoHeight();
    }

    public void sendTouch(int action, float x, float y, int viewW, int viewH) {
        int vw = getVideoWidth();
        int vh = getVideoHeight();
        if (!isStreaming() || vw <= 0 || vh <= 0 || viewW <= 0 || viewH <= 0) {
            return;
        }
        float mappedX = x / viewW * vw;
        float mappedY = y / viewH * vh;
        byte[] payload = ScrcpyControlWire.injectTouch(action, mappedX, mappedY, vw, vh);
        webSocketSession.sendControl(payload);
        if (controlRelay != null) {
            controlRelay.onControlSent(serial, payload, vw, vh);
        }
    }

    public void sendControl(byte[] payload) {
        if (payload != null && isStreaming()) {
            webSocketSession.sendControl(payload);
        }
    }

    public void bindTexture(TextureView view) {
        if (textureView == view) {
            applyLetterbox();
            return;
        }
        unbindTexture(textureView);
        textureView = view;
        if (view == null) {
            return;
        }
        final TextureView bound = view;
        GroupSlotSurfaceBinder.bind(view, new GroupSlotSurfaceBinder.Host() {
            @Override
            public void onSurfaceReady() {
                if (textureView != bound) {
                    return;
                }
                surfaceReady = true;
                applyLetterbox();
                maybeConnect();
            }

            @Override
            public void onSurfaceLost() {
                if (textureView == bound) {
                    surfaceReady = false;
                    decoder.attachSurface(null, null);
                }
            }

            @Override
            public void onSurfaceSized() {
                if (textureView == bound) {
                    applyLetterbox();
                }
            }

            @Override
            public void attachDecoder(Surface surface, SurfaceTexture texture) {
                if (textureView == bound) {
                    decoder.attachSurface(surface, texture);
                }
            }
        });
    }

    public void unbindTexture(TextureView view) {
        if (view == null || textureView != view) {
            return;
        }
        GroupSlotLetterbox.reset(view);
        textureView = null;
        surfaceReady = false;
        decoder.attachSurface(null, null);
    }

    public void start() {
        if (released.get()) {
            return;
        }
        if (started) {
            maybeConnect();
            return;
        }
        started = true;
        startupLog.reset();
        setState(STATE_STARTING, "");
        bootstrap.requestStart();
    }

    public void stop(boolean releaseBackend) {
        started = false;
        bootstrap.stopLogPolling();
        webSocketSession.close();
        streamParams = null;
        if (releaseBackend && backendHeld) {
            backendHeld = false;
            CastSessionController.stop(context, CastServerConfig.host(context),
                    CastServerConfig.port(context), serial);
        }
        setState(STATE_IDLE, "");
    }

    public void release() {
        released.set(true);
        stop(true);
        unbindTexture(textureView);
        decoder.release();
        callback = null;
        controlRelay = null;
    }

    public void sendNavigation(String actionId) {
        GroupSlotNavigation.send(webSocketSession, actionId);
    }

    private GroupSlotCastBootstrap.Sink sink() {
        return new GroupSlotCastBootstrap.Sink() {
            @Override public void onBackendReady(byte[] params, int logConsumed) {
                backendHeld = true;
                streamParams = params;
                maybeConnect();
            }

            @Override public void onError(String message) {
                appendLog(message);
                setState(STATE_ERROR, message);
            }

            @Override public void appendLog(String message) {
                GroupSlotCastSession.this.appendLog(message);
            }

            @Override public void pushUi() {
                GroupSlotCastSession.this.pushUi();
            }

            @Override public int ingestLogs(JSONArray logs, int from) {
                return startupLog.ingest(logs, from);
            }

            @Override public void maybeConnect() {
                GroupSlotCastSession.this.maybeConnect();
            }
        };
    }

    private void maybeConnect() {
        if (!surfaceReady || streamParams == null || !started || released.get()) {
            return;
        }
        if (webSocketSession.isOpen()) {
            return;
        }
        bootstrap.openStream(httpClient, webSocketSession, streamParams, () -> started, message -> {
            if (!started || released.get()) {
                return;
            }
            appendLog(message);
            setState(STATE_ERROR, message);
        });
    }

    private void applyLetterbox() {
        if (textureView != null) {
            GroupSlotLetterbox.apply(textureView, getVideoWidth(), getVideoHeight());
        }
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
            callback.onUiChanged(state, startupLog.text(), errorMessage, bootstrap.showingLogs());
        }
    }
}
