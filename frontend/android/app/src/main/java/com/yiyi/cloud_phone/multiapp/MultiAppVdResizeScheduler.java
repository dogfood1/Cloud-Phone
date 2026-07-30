package com.yiyi.cloud_phone.multiapp;

import android.os.Handler;
import android.os.Looper;

final class MultiAppVdResizeScheduler {
    interface ResizeAction {
        void applyResize(int vdWidth, int vdHeight);
        void bumpExitGrace(long ms);
    }

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ResizeAction action;
    private Runnable pending;
    private long resizeReadyAt;
    private int lastSentW;
    private int lastSentH;

    MultiAppVdResizeScheduler(ResizeAction action) {
        this.action = action;
    }

    void markCastReady(int vdWidth, int vdHeight) {
        resizeReadyAt = System.currentTimeMillis() + 1500L;
        lastSentW = vdWidth;
        lastSentH = vdHeight;
    }

    void schedule(int contentWidth, int contentHeight) {
        if (pending != null) {
            handler.removeCallbacks(pending);
        }
        long untilReady = Math.max(0, resizeReadyAt - System.currentTimeMillis());
        long delay = untilReady > 0 ? untilReady + 40L : 350L;
        pending = () -> {
            pending = null;
            applyNow(contentWidth, contentHeight);
        };
        handler.postDelayed(pending, delay);
    }

    void release() {
        if (pending != null) {
            handler.removeCallbacks(pending);
            pending = null;
        }
    }

    private void applyNow(int contentWidth, int contentHeight) {
        MultiAppWindowLayout.VdSize vd = MultiAppWindowLayout.resolveVdFromContent(contentWidth, contentHeight);
        if (Math.abs(vd.width - lastSentW) < 24 && Math.abs(vd.height - lastSentH) < 24) {
            return;
        }
        action.bumpExitGrace(12_000L);
        lastSentW = vd.width;
        lastSentH = vd.height;
        action.applyResize(vd.width, vd.height);
    }
}
