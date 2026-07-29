package com.yiyi.cloud_phone.apps;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.recyclerview.widget.DividerItemDecoration;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.yiyi.cloud_phone.AppIcons;
import com.yiyi.cloud_phone.CloudPhoneApiClient;
import com.yiyi.cloud_phone.R;
import com.yiyi.cloud_phone.files.DeviceFileExplorerActivity;
import com.yiyi.cloud_phone.logs.AppEventLogger;
import com.yiyi.cloud_phone.settings.ServerEndpointStore;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class DeviceAppManagerActivity extends AppCompatActivity {
    public static final String EXTRA_SERIAL = "device_serial";
    public static final String EXTRA_DISPLAY_NAME = "device_display_name";

    private String deviceSerial;
    private String deviceDisplayName;
    private AppItemAdapter adapter;
    private SwipeRefreshLayout swipeRefresh;
    private TextView textStatus;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    public static void open(Context context, String serial, String displayName) {
        Intent intent = new Intent(context, DeviceAppManagerActivity.class);
        intent.putExtra(EXTRA_SERIAL, serial);
        intent.putExtra(EXTRA_DISPLAY_NAME, displayName);
        context.startActivity(intent);
    }

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_device_app_manager);
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.appManagerRoot), (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return insets;
        });

        deviceSerial = getIntent().getStringExtra(EXTRA_SERIAL);
        if (deviceSerial == null) deviceSerial = "";
        deviceDisplayName = getIntent().getStringExtra(EXTRA_DISPLAY_NAME);
        if (deviceDisplayName == null) deviceDisplayName = deviceSerial;

        TextView titleView = findViewById(R.id.textAppManagerTitle);
        titleView.setText(getString(R.string.apps_title) + " – " + deviceDisplayName);

        ImageButton backBtn = findViewById(R.id.buttonAppManagerBack);
        backBtn.setImageDrawable(AppIcons.back(this));
        backBtn.setOnClickListener(v -> finish());

        ImageButton refreshBtn = findViewById(R.id.buttonAppManagerRefresh);
        refreshBtn.setImageDrawable(AppIcons.navRefresh(this));
        refreshBtn.setOnClickListener(v -> loadApps());

        ImageButton installBtn = findViewById(R.id.buttonInstallApp);
        installBtn.setImageDrawable(AppIcons.install(this));
        installBtn.setOnClickListener(v -> triggerInstall());

        EditText searchEdit = findViewById(R.id.editAppSearch);
        searchEdit.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                adapter.setFilter(s.toString());
                updateCount();
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        textStatus = findViewById(R.id.textAppStatus);

        RecyclerView recycler = findViewById(R.id.recyclerApps);
        recycler.setLayoutManager(new LinearLayoutManager(this));
        recycler.addItemDecoration(new DividerItemDecoration(this, DividerItemDecoration.VERTICAL));

        adapter = new AppItemAdapter();
        adapter.setOnAppClickListener(this::showAppDetail);
        recycler.setAdapter(adapter);

        swipeRefresh = findViewById(R.id.swipeRefreshApps);
        swipeRefresh.setOnRefreshListener(this::loadApps);

        loadApps();
    }

    private void loadApps() {
        swipeRefresh.setRefreshing(true);
        textStatus.setText(R.string.apps_loading);
        textStatus.setVisibility(View.VISIBLE);

        ServerEndpointStore.Endpoint store = ServerEndpointStore.read(this);
        executor.execute(() -> {
            try {
                JSONObject result = CloudPhoneApiClient.listApps(this, store.host, store.port, deviceSerial);
                JSONArray appsJson = result.optJSONArray("apps");
                List<AppItem> apps = new ArrayList<>();
                if (appsJson != null) {
                    for (int i = 0; i < appsJson.length(); i++) {
                        apps.add(new AppItem(appsJson.getJSONObject(i)));
                    }
                }
                AppEventLogger.get().info("apps", "load", "Loaded " + apps.size() + " apps for " + deviceSerial);
                runOnUiThread(() -> {
                    swipeRefresh.setRefreshing(false);
                    adapter.setApps(apps);
                    updateCount();
                    textStatus.setVisibility(View.GONE);
                });
            } catch (Exception e) {
                runOnUiThread(() -> {
                    swipeRefresh.setRefreshing(false);
                    textStatus.setText(e.getMessage());
                    textStatus.setVisibility(View.VISIBLE);
                });
            }
        });
    }

    private void updateCount() {
        int count = adapter.getFilteredApps().size();
        // Count shown in textStatus when no error
    }

    private void showAppDetail(AppItem app) {
        AppDetailBottomSheet sheet = AppDetailBottomSheet.newInstance(app, deviceSerial, deviceDisplayName);
        sheet.setOnActionListener(new AppDetailBottomSheet.OnActionListener() {
            @Override
            public void onUninstalled(String packageName) {
                loadApps();
            }

            @Override
            public void onFrozenChanged(String packageName, boolean frozen) {
                loadApps();
            }

            @Override
            public void onOpenDataDir(String path) {
                DeviceFileExplorerActivity.open(DeviceAppManagerActivity.this, deviceSerial, deviceDisplayName, path);
            }
        });
        sheet.show(getSupportFragmentManager(), "app_detail");
    }

    private void triggerInstall() {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("application/vnd.android.package-archive");
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        startActivityForResult(Intent.createChooser(intent, getString(R.string.apps_install)), 1002);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 1002 && resultCode == Activity.RESULT_OK && data != null && data.getData() != null) {
            android.net.Uri fileUri = data.getData();
            ServerEndpointStore.Endpoint store = ServerEndpointStore.read(this);
            executor.execute(() -> {
                try (java.io.InputStream is = getContentResolver().openInputStream(fileUri)) {
                    CloudPhoneApiClient.installApp(this, store.host, store.port, deviceSerial, is);
                    runOnUiThread(() -> {
                        Toast.makeText(this, R.string.apps_install_success, Toast.LENGTH_SHORT).show();
                        loadApps();
                    });
                } catch (Exception e) {
                    runOnUiThread(() ->
                            Toast.makeText(this, getString(R.string.apps_install_failed, e.getMessage()), Toast.LENGTH_SHORT).show());
                }
            });
        }
    }

    @Override
    protected void onDestroy() {
        executor.shutdown();
        super.onDestroy();
    }
}
