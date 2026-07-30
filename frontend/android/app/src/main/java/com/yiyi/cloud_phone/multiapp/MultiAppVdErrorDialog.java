package com.yiyi.cloud_phone.multiapp;

import android.text.method.LinkMovementMethod;
import android.widget.TextView;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.yiyi.cloud_phone.R;

public final class MultiAppVdErrorDialog {
    private MultiAppVdErrorDialog() {
    }

    public static void show(
            AppCompatActivity activity,
            String detail,
            Runnable onCloseWindow,
            Runnable onRetry,
            Runnable onSwitchMirror
    ) {
        String message = MultiAppVdErrorHelper.formatUserMessage(detail);
        AlertDialog dialog = new AlertDialog.Builder(activity)
                .setTitle(R.string.multi_app_vd_error_title)
                .setMessage(message + "\n\n• 可改用「镜像投屏」操作主屏幕\n• 或等待厂商系统升级\n• 部分机型可尝试解锁屏幕后重试")
                .setCancelable(false)
                .setNegativeButton(R.string.multi_app_vd_close_window, (d, w) -> {
                    if (onCloseWindow != null) {
                        onCloseWindow.run();
                    }
                })
                .setNeutralButton(R.string.multi_app_vd_retry, (d, w) -> {
                    if (onRetry != null) {
                        onRetry.run();
                    }
                })
                .setPositiveButton(R.string.multi_app_vd_switch_mirror, (d, w) -> {
                    if (onSwitchMirror != null) {
                        onSwitchMirror.run();
                    }
                })
                .create();
        dialog.setOnShowListener(d -> {
            TextView messageView = dialog.findViewById(android.R.id.message);
            if (messageView != null) {
                messageView.setMovementMethod(LinkMovementMethod.getInstance());
            }
        });
        dialog.show();
    }
}
