package com.yiyi.cloud_phone.terminal;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ImageButton;
import android.widget.TextView;

import androidx.activity.EdgeToEdge;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.google.android.material.button.MaterialButton;
import com.yiyi.cloud_phone.AppIcons;
import com.yiyi.cloud_phone.R;
import com.yiyi.cloud_phone.logs.AppEventLogger;
import com.yiyi.cloud_phone.settings.ServerEndpointStore;

import java.nio.charset.StandardCharsets;

public class DeviceTerminalActivity extends AppCompatActivity {
    public static final String EXTRA_SERIAL = "device_serial";
    public static final String EXTRA_DISPLAY_NAME = "device_display_name";

    private String deviceSerial;
    private String deviceDisplayName;
    private TerminalWebSocket webSocket;
    private AnsiTerminalView terminalView;
    private TextView statusText;
    private MaterialButton reconnectBtn;

    enum Status { CONNECTING, CONNECTED, CLOSED, ERROR }

    public static void open(Context context, String serial, String displayName) {
        Intent intent = new Intent(context, DeviceTerminalActivity.class);
        intent.putExtra(EXTRA_SERIAL, serial);
        intent.putExtra(EXTRA_DISPLAY_NAME, displayName);
        context.startActivity(intent);
    }

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_device_terminal);
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.terminalRoot), (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
            return insets;
        });

        deviceSerial = getIntent().getStringExtra(EXTRA_SERIAL);
        if (deviceSerial == null) {
            deviceSerial = "";
        }
        deviceDisplayName = getIntent().getStringExtra(EXTRA_DISPLAY_NAME);
        if (deviceDisplayName == null) {
            deviceDisplayName = deviceSerial;
        }

        TextView titleView = findViewById(R.id.textTerminalTitle);
        titleView.setText(getString(R.string.terminal_title) + " – " + deviceDisplayName);

        ImageButton backBtn = findViewById(R.id.buttonTerminalBack);
        backBtn.setImageDrawable(AppIcons.back(this));
        backBtn.setOnClickListener(v -> finish());

        statusText = findViewById(R.id.textTerminalStatus);
        reconnectBtn = findViewById(R.id.buttonReconnect);
        reconnectBtn.setOnClickListener(v -> reconnect());

        terminalView = findViewById(R.id.terminalView);
        terminalView.setInputListener(this::sendInput);

        TerminalExtraKeysBar extraKeys = findViewById(R.id.terminalExtraKeys);
        extraKeys.setListener(new TerminalExtraKeysBar.Listener() {
            @Override
            public void onBytes(byte[] data) {
                sendInput(data);
            }

            @Override
            public void onToggleSoftKeyboard() {
                terminalView.toggleSoftKeyboard();
            }
        });

        terminalView.setOnClickListener(v -> terminalView.showSoftKeyboard());
        connect();
    }

    private void sendInput(byte[] data) {
        if (webSocket != null) {
            webSocket.sendInput(data);
        }
    }

    private void connect() {
        setStatus(Status.CONNECTING);
        terminalView.clear();

        String host = ServerEndpointStore.host(this);
        int port = ServerEndpointStore.port(this);

        webSocket = new TerminalWebSocket(new TerminalWebSocket.Callback() {
            @Override
            public void onConnected() {
                AppEventLogger.get().info("terminal", "connect", "Connected to " + deviceSerial);
                runOnUiThread(() -> {
                    setStatus(Status.CONNECTED);
                    terminalView.post(() -> {
                        webSocket.sendResize(terminalView.getCols(), terminalView.getRows());
                        terminalView.showSoftKeyboard();
                    });
                });
            }

            @Override
            public void onOutput(byte[] data) {
                runOnUiThread(() -> terminalView.appendData(data));
            }

            @Override
            public void onClosed(String reason) {
                AppEventLogger.get().info("terminal", "closed", "Terminal closed: " + reason);
                runOnUiThread(() -> setStatus(Status.CLOSED));
            }

            @Override
            public void onError(String error) {
                AppEventLogger.get().error("terminal", "error", "Terminal error: " + error);
                runOnUiThread(() -> {
                    setStatus(Status.ERROR);
                    terminalView.appendData(("\r\n[Error: " + error + "]\r\n").getBytes(StandardCharsets.UTF_8));
                });
            }
        });
        webSocket.connect(host, port, deviceSerial);
    }

    private void reconnect() {
        if (webSocket != null) {
            webSocket.close();
            webSocket = null;
        }
        connect();
    }

    private void setStatus(Status status) {
        int textRes;
        switch (status) {
            case CONNECTING:
                textRes = R.string.terminal_status_connecting;
                break;
            case CONNECTED:
                textRes = R.string.terminal_status_connected;
                break;
            case ERROR:
                textRes = R.string.terminal_status_error;
                break;
            default:
                textRes = R.string.terminal_status_closed;
        }
        statusText.setText(textRes);
        reconnectBtn.setVisibility(
                status == Status.CLOSED || status == Status.ERROR ? View.VISIBLE : View.GONE);
    }

    @Override
    protected void onDestroy() {
        if (webSocket != null) {
            webSocket.close();
        }
        super.onDestroy();
    }
}
