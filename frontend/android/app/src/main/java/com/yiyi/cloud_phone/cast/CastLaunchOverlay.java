package com.yiyi.cloud_phone.cast;

import android.view.View;
import android.widget.TextView;

public final class CastLaunchOverlay {
    private final View root;
    private final TextView titleText;
    private final CastStartupLog startupLog;

    CastLaunchOverlay(View root) {
        this.root = root;
        titleText = root.findViewById(com.yiyi.cloud_phone.R.id.castLoadingText);
        startupLog = new CastStartupLog(
                root.findViewById(com.yiyi.cloud_phone.R.id.castLogText),
                root.findViewById(com.yiyi.cloud_phone.R.id.castLogScroll)
        );
    }

    public void show() {
        root.setVisibility(View.VISIBLE);
    }

    public void hide() {
        root.setVisibility(View.GONE);
    }

    public boolean isVisible() {
        return root.getVisibility() == View.VISIBLE;
    }

    public void reset(String placeholder) {
        startupLog.reset(placeholder);
    }

    public void append(String line) {
        startupLog.append(line);
    }

    public void setTitle(int titleRes) {
        titleText.setText(titleRes);
    }
}
