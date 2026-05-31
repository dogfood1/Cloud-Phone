package com.yiyi.cloud_phone.cast;

import android.content.Context;
import android.graphics.SurfaceTexture;
import android.view.Surface;
import android.view.TextureView;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.yiyi.cloud_phone.DeviceCastApi;
import com.yiyi.cloud_phone.R;
import com.yiyi.cloud_phone.workspace.CastMode;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.CookieHandler;
import java.net.CookieManager;

import okhttp3.JavaNetCookieJar;
import okhttp3.OkHttpClient;

public final class CastViewportController {
    public interface Host {
        AppCompatActivity activity();

        String serial();

        int deviceSdk();

        CastMode castMode();

        JSONObject settings();

        void onCastActiveChanged(boolean active);

        void onCastFailed(String message);
    }

    public interface ToolbarHandler {
        void onStopRequested();

        void onRotateRequested();
    }

    private Host host;
    private FrameLayout rootLayout;
    private TextureView textureView;
    private View placeholderView;
    private View logOverlay;
    private View errorOverlay;
    private TextView errorText;
    private TextView loadingTitleText;
    private View fullscreenButton;

    private final AnnexBH264Decoder decoder = new AnnexBH264Decoder();
    private final CastStartupLogReader logReader = new CastStartupLogReader();
    private CastStartupLog startupLog;
    private CastWebSocketSession webSocketSession;
    private CastInteractionController interactionController;
    private OkHttpClient httpClient;

    private byte[] pendingStreamParams;
    private byte[] lastStreamParams;
    private JSONArray cachedStartupLogs = new JSONArray();
    private boolean surfaceReady;
    private boolean backendActive;
    private boolean streamReady;
    private boolean initialInfoReceived;
    private boolean manualRotationOverride;
    private int videoWidth;
    private int videoHeight;
    private int previewRotation;

    public void bind(View root, Host host, boolean showFullscreenButton) {
        this.host = host;
        rootLayout = (FrameLayout) root;
        textureView = root.findViewById(R.id.castTexture);
        placeholderView = root.findViewById(R.id.castViewportPlaceholder);
        logOverlay = root.findViewById(R.id.castCanvasLogOverlay);
        if (logOverlay == null) {
            logOverlay = root.findViewById(R.id.castCanvasLogRoot);
        }
        errorOverlay = root.findViewById(R.id.castOverlayError);
        errorText = root.findViewById(R.id.castErrorText);
        loadingTitleText = root.findViewById(R.id.castLoadingText);
        fullscreenButton = root.findViewById(R.id.castFullscreenButton);
        startupLog = new CastStartupLog(
                root.findViewById(R.id.castLogText),
                root.findViewById(R.id.castLogScroll)
        );

        if (fullscreenButton != null) {
            fullscreenButton.setVisibility(showFullscreenButton ? View.VISIBLE : View.GONE);
        }

        setupHttpClient();
        setupDecoder();
        setupTextureView();
    }

    public void attachToolbar(View toolbarRoot, ToolbarHandler toolbarHandler) {
        AppCompatActivity activity = host.activity();
        interactionController = new CastInteractionController(
                activity,
                host.castMode(),
                new CastInteractionController.TextureHolder() {
                    @Override
                    public View getTouchTarget() {
                        return textureView;
                    }

                    @Override
                    public int getWidth() {
                        return textureView.getWidth();
                    }

                    @Override
                    public int getHeight() {
                        return textureView.getHeight();
                    }
                },
                webSocketSession,
                toolbarHandler
        );
        interactionController.bind((LinearLayout) toolbarRoot);
        interactionController.setInteractionEnabled(host.castMode() != CastMode.CAMERA);
        interactionController.setPreviewRotation(previewRotation);
    }

    public void attachToolbarDock(
            View toolbarRoot,
            android.widget.HorizontalScrollView toolbarScroll,
            android.widget.ImageButton toolbarToggle,
            ToolbarHandler toolbarHandler
    ) {
        attachToolbar(toolbarRoot, toolbarHandler);
        new CastToolbarController(toolbarScroll, toolbarToggle);
    }

    public void setFullscreenClickListener(View.OnClickListener listener) {
        if (fullscreenButton != null) {
            fullscreenButton.setOnClickListener(listener);
        }
    }

    public boolean isCasting() {
        return backendActive || streamReady || pendingStreamParams != null;
    }

    public byte[] exportStreamParams() {
        if (pendingStreamParams != null) {
            return pendingStreamParams;
        }
        return lastStreamParams;
    }

    public JSONArray exportStartupLogs() {
        return cachedStartupLogs;
    }

    public void beginCast() {
        if (backendActive || pendingStreamParams != null) {
            return;
        }
        AppCompatActivity activity = host.activity();
        placeholderView.setVisibility(View.GONE);
        errorOverlay.setVisibility(View.GONE);
        logOverlay.setVisibility(View.VISIBLE);
        streamReady = false;
        initialInfoReceived = false;
        logReader.reset();
        cachedStartupLogs = new JSONArray();
        startupLog.reset(activity.getString(R.string.cast_log_placeholder));
        loadingTitleText.setText(R.string.cast_starting);
        appendLog(activity.getString(R.string.cast_log_user_start));
        appendLog(activity.getString(R.string.cast_log_start_backend));
        host.onCastActiveChanged(true);

        CastConnectCoordinator.startBackend(
                activity,
                CastServerConfig.host(activity),
                CastServerConfig.port(activity),
                host.serial(),
                host.castMode(),
                host.settings(),
                host.deviceSdk(),
                new CastConnectCoordinator.Host() {
                    @Override
                    public void onBackendStarted(org.json.JSONObject session, byte[] streamParams) {
                        activity.runOnUiThread(() -> onBackendReady(session, streamParams));
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
                        activity.runOnUiThread(() -> showError(message));
                    }
                }
        );
    }

    public void beginWithBackend(byte[] streamParams, JSONArray startupLogs) {
        backendActive = true;
        pendingStreamParams = streamParams;
        AppCompatActivity activity = host.activity();
        placeholderView.setVisibility(View.GONE);
        errorOverlay.setVisibility(View.GONE);
        logOverlay.setVisibility(View.VISIBLE);
        streamReady = false;
        initialInfoReceived = false;
        logReader.reset();
        cachedStartupLogs = new JSONArray();
        startupLog.reset(activity.getString(R.string.cast_log_placeholder));
        loadingTitleText.setText(R.string.cast_starting);
        appendLog(activity.getString(R.string.cast_log_user_start));
        ingestBackendLogs(startupLogs);
        appendLog(activity.getString(R.string.cast_log_frontend_ready));
        host.onCastActiveChanged(true);
        maybeConnectWebSocket();
    }

    public void stopCast() {
        webSocketSession.close();
        decoder.release();
        if (backendActive) {
            CastSessionController.stop(
                    host.activity(),
                    CastServerConfig.host(host.activity()),
                    CastServerConfig.port(host.activity()),
                    host.serial()
            );
            backendActive = false;
        }
        pendingStreamParams = null;
        streamReady = false;
        textureView.setVisibility(View.INVISIBLE);
        logOverlay.setVisibility(View.GONE);
        errorOverlay.setVisibility(View.GONE);
        placeholderView.setVisibility(View.VISIBLE);
        host.onCastActiveChanged(false);
    }

    public void release() {
        webSocketSession.close();
        decoder.release();
    }

    private void onBackendReady(JSONObject session, byte[] streamParams) {
        backendActive = true;
        pendingStreamParams = streamParams;
        lastStreamParams = streamParams;
        if (session != null) {
            ingestBackendLogs(session.optJSONArray("startupLogs"));
        }
        appendLog(host.activity().getString(R.string.cast_log_frontend_ready));
        maybeConnectWebSocket();
    }

    private void ingestBackendLogs(JSONArray logs) {
        logReader.appendNewEntries(startupLog, logs);
        if (logs == null) {
            return;
        }
        for (int index = 0; index < logs.length(); index += 1) {
            JSONObject entry = logs.optJSONObject(index);
            if (entry != null) {
                cachedStartupLogs.put(entry);
            }
        }
    }

    private void refreshBackendLogsAsync() {
        Context context = host.activity();
        String serial = host.serial();
        Thread worker = new Thread(() -> {
            try {
                JSONObject status = DeviceCastApi.getCastStatus(
                        context,
                        CastServerConfig.host(context),
                        CastServerConfig.port(context),
                        serial
                );
                JSONArray logs = status.optJSONArray("startupLogs");
                host.activity().runOnUiThread(() -> ingestBackendLogs(logs));
            } catch (Exception ignored) {
                // ignore polling failures
            }
        }, "cast-log-poll");
        worker.start();
    }

    private void setupHttpClient() {
        CookieHandler handler = CookieHandler.getDefault();
        OkHttpClient.Builder builder = new OkHttpClient.Builder();
        if (handler instanceof CookieManager) {
            builder.cookieJar(new JavaNetCookieJar((CookieManager) handler));
        }
        httpClient = builder.build();
        webSocketSession = new CastWebSocketSession(decoder);
    }

    private void setupDecoder() {
        decoder.setListener(new AnnexBH264Decoder.Listener() {
            @Override
            public void onVideoFrameSize(int width, int height) {
                host.activity().runOnUiThread(() -> {
                    videoWidth = width;
                    videoHeight = height;
                    if (interactionController != null) {
                        interactionController.setVideoSize(width, height);
                    }
                    appendLog(host.activity().getString(R.string.cast_log_video_size, width, height));
                    applyLetterboxWithAutoRotation();
                });
            }

            @Override
            public void onFrameRendered() {
                host.activity().runOnUiThread(CastViewportController.this::onFirstFrameRendered);
            }
        });
    }

    private void setupTextureView() {
        textureView.setSurfaceTextureListener(new TextureView.SurfaceTextureListener() {
            @Override
            public void onSurfaceTextureAvailable(SurfaceTexture surface, int width, int height) {
                surfaceReady = true;
                decoder.attachSurface(new Surface(surface), surface);
                appendLog(host.activity().getString(R.string.cast_log_surface_ready));
                applyLetterboxWithAutoRotation();
                maybeConnectWebSocket();
            }

            @Override
            public void onSurfaceTextureSizeChanged(SurfaceTexture surface, int width, int height) {
                applyLetterboxWithAutoRotation();
            }

            @Override
            public boolean onSurfaceTextureDestroyed(SurfaceTexture surface) {
                surfaceReady = false;
                decoder.attachSurface(null, null);
                return true;
            }

            @Override
            public void onSurfaceTextureUpdated(SurfaceTexture surface) {
                if (backendActive && !streamReady) {
                    host.activity().runOnUiThread(CastViewportController.this::onFirstFrameRendered);
                }
            }
        });
    }

    private void hideLogOverlay() {
        if (logOverlay != null) {
            logOverlay.animate().cancel();
            logOverlay.clearAnimation();
            logOverlay.setAlpha(1f);
            logOverlay.setVisibility(View.GONE);
        }
        textureView.setVisibility(View.VISIBLE);
    }

    private void maybeConnectWebSocket() {
        if (!surfaceReady || pendingStreamParams == null) {
            if (pendingStreamParams != null && !surfaceReady) {
                appendLog(host.activity().getString(R.string.cast_log_wait_surface));
            }
            return;
        }
        byte[] streamParams = pendingStreamParams;
        pendingStreamParams = null;
        appendLog(host.activity().getString(R.string.cast_log_connect_ws));
        CastConnectCoordinator.openStream(
                httpClient,
                webSocketSession,
                CastServerConfig.host(host.activity()),
                CastServerConfig.port(host.activity()),
                host.serial(),
                streamParams,
                new CastConnectCoordinator.Host() {
                    @Override
                    public void onBackendStarted(org.json.JSONObject session, byte[] streamParams) {
                        // no-op
                    }

                    @Override
                    public void onWebSocketOpen() {
                        appendLog(host.activity().getString(R.string.cast_log_ws_open));
                        refreshBackendLogsAsync();
                    }

                    @Override
                    public void onInitialInfo() {
                        if (initialInfoReceived) {
                            return;
                        }
                        initialInfoReceived = true;
                        appendLog(host.activity().getString(R.string.cast_log_initial_info));
                        loadingTitleText.setText(R.string.cast_log_wait_first_frame);
                        refreshBackendLogsAsync();
                    }

                    @Override
                    public void onStreamError(String message) {
                        showError(message);
                    }
                }
        );
    }

    private void onFirstFrameRendered() {
        if (streamReady) {
            return;
        }
        streamReady = true;
        appendLog(host.activity().getString(R.string.cast_log_first_frame));
        hideLogOverlay();
        if (fullscreenButton != null && fullscreenButton.getVisibility() == View.VISIBLE) {
            fullscreenButton.setVisibility(View.VISIBLE);
        }
        applyLetterboxWithAutoRotation();
    }

    private void applyLetterboxWithAutoRotation() {
        if (!manualRotationOverride && videoWidth > 0 && videoHeight > 0) {
            previewRotation = CastSurfaceLayout.suggestAutoRotation(
                    rootLayout.getWidth(),
                    rootLayout.getHeight(),
                    videoWidth,
                    videoHeight
            );
            if (interactionController != null) {
                interactionController.setPreviewRotation(previewRotation);
            }
        }
        CastSurfaceLayout.applyLetterbox(
                rootLayout,
                textureView,
                videoWidth,
                videoHeight,
                previewRotation
        );
    }

    public void onConfigurationChanged() {
        rootLayout.post(this::applyLetterboxWithAutoRotation);
    }

    public void rotatePreview() {
        manualRotationOverride = true;
        previewRotation = (previewRotation + 90) % 360;
        if (interactionController != null) {
            interactionController.setPreviewRotation(previewRotation);
        }
        applyLetterboxWithAutoRotation();
    }

    private void appendLog(String message) {
        if (startupLog != null) {
            startupLog.append(message);
        }
    }

    private void showError(String message) {
        AppCompatActivity activity = host.activity();
        appendLog(activity.getString(R.string.cast_log_error, resolveErrorMessage(message)));
        logOverlay.setVisibility(View.GONE);
        errorOverlay.setVisibility(View.VISIBLE);
        errorText.setText(resolveErrorMessage(message));
        Toast.makeText(activity, resolveErrorMessage(message), Toast.LENGTH_SHORT).show();
        host.onCastFailed(message);
    }

    private String resolveErrorMessage(String message) {
        AppCompatActivity activity = host.activity();
        if ("websocket_unauthorized".equals(message)) {
            return activity.getString(R.string.cast_unauthorized);
        }
        if (message == null || message.isEmpty()) {
            return activity.getString(R.string.cast_start_failed);
        }
        return message;
    }
}
