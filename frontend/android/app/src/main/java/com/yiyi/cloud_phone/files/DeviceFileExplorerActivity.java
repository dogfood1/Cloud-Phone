package com.yiyi.cloud_phone.files;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
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
import androidx.core.content.FileProvider;
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
import com.yiyi.cloud_phone.settings.ServerEndpointStore;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class DeviceFileExplorerActivity extends AppCompatActivity {
    public static final String EXTRA_SERIAL = "device_serial";
    public static final String EXTRA_DISPLAY_NAME = "device_display_name";
    public static final String EXTRA_OPEN_PATH = "open_path";

    private String deviceSerial;
    private String deviceDisplayName;
    private String currentPath;

    private final Deque<String> navHistory = new ArrayDeque<>();
    private int navIndex = -1;

    private FileEntryAdapter adapter;
    private SwipeRefreshLayout swipeRefresh;
    private TextView textStatus;
    private TextView textPath;
    private EditText editAddress;
    private ImageButton btnBack;
    private ImageButton btnForward;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    public static void open(Context context, String serial, String displayName, String openPath) {
        Intent intent = new Intent(context, DeviceFileExplorerActivity.class);
        intent.putExtra(EXTRA_SERIAL, serial);
        intent.putExtra(EXTRA_DISPLAY_NAME, displayName);
        if (openPath != null) intent.putExtra(EXTRA_OPEN_PATH, openPath);
        context.startActivity(intent);
    }

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_device_file_explorer);
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.fileExplorerRoot), (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return insets;
        });

        deviceSerial = getIntent().getStringExtra(EXTRA_SERIAL);
        if (deviceSerial == null) deviceSerial = "";
        deviceDisplayName = getIntent().getStringExtra(EXTRA_DISPLAY_NAME);
        if (deviceDisplayName == null) deviceDisplayName = deviceSerial;
        String openPath = getIntent().getStringExtra(EXTRA_OPEN_PATH);
        currentPath = openPath != null ? openPath : DeviceFilePath.DEFAULT_PATH;

        TextView titleView = findViewById(R.id.textFileExplorerTitle);
        titleView.setText(getString(R.string.files_title) + " – " + deviceDisplayName);

        ImageButton backBtn = findViewById(R.id.buttonFileBack);
        backBtn.setImageDrawable(AppIcons.back(this));
        backBtn.setOnClickListener(v -> finish());

        btnBack = findViewById(R.id.buttonNavBack);
        btnBack.setImageDrawable(AppIcons.navBack(this));
        btnBack.setOnClickListener(v -> navigateBack());

        btnForward = findViewById(R.id.buttonNavForward);
        btnForward.setImageDrawable(AppIcons.navForward(this));
        btnForward.setOnClickListener(v -> navigateForward());

        ImageButton btnUp = findViewById(R.id.buttonNavUp);
        btnUp.setImageDrawable(AppIcons.navUp(this));
        btnUp.setOnClickListener(v -> navigateTo(DeviceFilePath.parent(currentPath)));

        ImageButton btnRefresh = findViewById(R.id.buttonNavRefresh);
        btnRefresh.setImageDrawable(AppIcons.navRefresh(this));
        btnRefresh.setOnClickListener(v -> loadDirectory(currentPath));

        ImageButton btnUpload = findViewById(R.id.buttonNavUpload);
        btnUpload.setImageDrawable(AppIcons.navUpload(this));
        btnUpload.setOnClickListener(v -> triggerUpload());

        editAddress = findViewById(R.id.editAddress);
        editAddress.setText(currentPath);

        ImageButton btnGo = findViewById(R.id.buttonGo);
        btnGo.setOnClickListener(v -> {
            String addr = editAddress.getText().toString().trim();
            if (!addr.isEmpty()) navigateTo(DeviceFilePath.normalize(addr));
        });

        textStatus = findViewById(R.id.textFileStatus);
        textPath = null;

        RecyclerView recycler = findViewById(R.id.recyclerFiles);
        recycler.setLayoutManager(new LinearLayoutManager(this));
        recycler.addItemDecoration(new DividerItemDecoration(this, DividerItemDecoration.VERTICAL));

        adapter = new FileEntryAdapter();
        adapter.setOnEntryClickListener(entry -> {
            if (entry.isDirectory()) {
                navigateTo(DeviceFilePath.join(currentPath, entry.name));
            } else if (entry.isSymlink() && !entry.linkTarget.isEmpty()) {
                navigateTo(DeviceFilePath.normalize(entry.linkTarget));
            }
        });
        adapter.setOnDownloadClickListener(this::downloadEntry);
        recycler.setAdapter(adapter);

        swipeRefresh = findViewById(R.id.swipeRefreshFiles);
        swipeRefresh.setOnRefreshListener(() -> loadDirectory(currentPath));

        pushHistory(currentPath);
        loadDirectory(currentPath);
    }

    private void navigateTo(String path) {
        currentPath = path;
        editAddress.setText(currentPath);
        pushHistory(currentPath);
        loadDirectory(currentPath);
    }

    private void navigateBack() {
        if (navIndex > 0) {
            navIndex--;
            String path = historyAt(navIndex);
            if (path != null) {
                currentPath = path;
                editAddress.setText(currentPath);
                loadDirectory(currentPath);
            }
        }
        updateNavButtons();
    }

    private void navigateForward() {
        String[] arr = navHistory.toArray(new String[0]);
        if (navIndex < arr.length - 1) {
            navIndex++;
            currentPath = arr[navIndex];
            editAddress.setText(currentPath);
            loadDirectory(currentPath);
        }
        updateNavButtons();
    }

    private void pushHistory(String path) {
        String[] arr = navHistory.toArray(new String[0]);
        List<String> list = new ArrayList<>();
        for (int i = 0; i <= navIndex && i < arr.length; i++) list.add(arr[i]);
        list.add(path);
        navHistory.clear();
        for (String s : list) navHistory.addLast(s);
        navIndex = list.size() - 1;
        updateNavButtons();
    }

    private String historyAt(int index) {
        String[] arr = navHistory.toArray(new String[0]);
        if (index >= 0 && index < arr.length) return arr[index];
        return null;
    }

    private void updateNavButtons() {
        btnBack.setEnabled(navIndex > 0);
        btnForward.setEnabled(navIndex < navHistory.size() - 1);
    }

    private void loadDirectory(String path) {
        swipeRefresh.setRefreshing(true);
        textStatus.setText(R.string.files_loading);
        textStatus.setVisibility(View.VISIBLE);

        String host = ServerEndpointStore.host(this);
        int port = ServerEndpointStore.port(this);

        executor.execute(() -> {
            try {
                JSONObject result = CloudPhoneApiClient.listFiles(this, host, port, deviceSerial, path);
                JSONArray entriesJson = result.optJSONArray("entries");
                List<FileEntry> entries = new ArrayList<>();
                if (entriesJson != null) {
                    for (int i = 0; i < entriesJson.length(); i++) {
                        entries.add(new FileEntry(entriesJson.getJSONObject(i)));
                    }
                }
                runOnUiThread(() -> {
                    swipeRefresh.setRefreshing(false);
                    adapter.setEntries(entries);
                    if (entries.isEmpty()) {
                        textStatus.setText(R.string.files_empty);
                        textStatus.setVisibility(View.VISIBLE);
                    } else {
                        textStatus.setText(getString(R.string.files_item_count, entries.size()));
                        textStatus.setVisibility(View.VISIBLE);
                    }
                });
            } catch (Exception e) {
                runOnUiThread(() -> {
                    swipeRefresh.setRefreshing(false);
                    textStatus.setText(getString(R.string.files_error, e.getMessage()));
                    textStatus.setVisibility(View.VISIBLE);
                    adapter.setEntries(null);
                });
            }
        });
    }

    private void downloadEntry(FileEntry entry) {
        String filePath = DeviceFilePath.join(currentPath, entry.name);
        String host = ServerEndpointStore.host(this);
        int port = ServerEndpointStore.port(this);

        executor.execute(() -> {
            try {
                byte[] data = CloudPhoneApiClient.downloadFile(this, host, port, deviceSerial, filePath);
                File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                File outFile = new File(downloadsDir, entry.name);
                try (FileOutputStream fos = new FileOutputStream(outFile)) {
                    fos.write(data);
                }
                runOnUiThread(() ->
                        Toast.makeText(this, getString(R.string.files_download_success, entry.name), Toast.LENGTH_SHORT).show());
            } catch (Exception e) {
                runOnUiThread(() ->
                        Toast.makeText(this, getString(R.string.files_download_failed, e.getMessage()), Toast.LENGTH_SHORT).show());
            }
        });
    }

    private void triggerUpload() {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("*/*");
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        startActivityForResult(Intent.createChooser(intent, getString(R.string.files_nav_upload)), 1001);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 1001 && resultCode == Activity.RESULT_OK && data != null && data.getData() != null) {
            Uri fileUri = data.getData();
            String fileName = getFileNameFromUri(fileUri);
            if (fileName == null) fileName = "upload_" + System.currentTimeMillis();

            String targetPath = DeviceFilePath.join(currentPath, fileName);
            String finalFileName = fileName;

            String host = ServerEndpointStore.host(this);
            int port = ServerEndpointStore.port(this);

            final String finalTargetPath = targetPath;
            executor.execute(() -> {
                try (java.io.InputStream is = getContentResolver().openInputStream(fileUri)) {
                    CloudPhoneApiClient.uploadFile(this, host, port, deviceSerial, finalTargetPath, is);
                    runOnUiThread(() -> {
                        Toast.makeText(this, getString(R.string.files_upload_success, finalFileName), Toast.LENGTH_SHORT).show();
                        loadDirectory(currentPath);
                    });
                } catch (Exception e) {
                    runOnUiThread(() ->
                            Toast.makeText(this, getString(R.string.files_upload_failed, e.getMessage()), Toast.LENGTH_SHORT).show());
                }
            });
        }
    }

    private String getFileNameFromUri(Uri uri) {
        String result = null;
        if ("content".equals(uri.getScheme())) {
            try (android.database.Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int idx = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME);
                    if (idx >= 0) result = cursor.getString(idx);
                }
            }
        }
        if (result == null) {
            result = uri.getPath();
            if (result != null) {
                int cut = result.lastIndexOf('/');
                if (cut != -1) result = result.substring(cut + 1);
            }
        }
        return result;
    }

    @Override
    protected void onDestroy() {
        executor.shutdown();
        super.onDestroy();
    }
}
