package com.yiyi.cloud_phone.multiapp;

import android.view.MotionEvent;
import android.view.View;

final class MultiAppWindowResizeTouch implements View.OnTouchListener {
    interface Listener {
        void onResize(int x, int y, int width, int height);
        void onFocus();
    }

    private final MultiAppWindowState win;
    private final String edge;
    private final Listener listener;
    private float startX;
    private float startY;
    private int origX;
    private int origY;
    private int origW;
    private int origH;

    MultiAppWindowResizeTouch(MultiAppWindowState win, String edge, Listener listener) {
        this.win = win;
        this.edge = edge;
        this.listener = listener;
    }

    @Override
    public boolean onTouch(View v, MotionEvent event) {
        if (win.maximized) {
            return false;
        }
        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                listener.onFocus();
                startX = event.getRawX();
                startY = event.getRawY();
                origX = win.x;
                origY = win.y;
                origW = win.width;
                origH = win.height;
                return true;
            case MotionEvent.ACTION_MOVE:
                int dx = Math.round(event.getRawX() - startX);
                int dy = Math.round(event.getRawY() - startY);
                int x = origX;
                int y = origY;
                int width = origW;
                int height = origH;
                if (edge.contains("e")) {
                    width = Math.max(MultiAppWindowState.MIN_W, origW + dx);
                }
                if (edge.contains("s")) {
                    height = Math.max(MultiAppWindowState.MIN_H + MultiAppWindowState.TITLE_BAR_H, origH + dy);
                }
                if (edge.contains("w")) {
                    width = Math.max(MultiAppWindowState.MIN_W, origW - dx);
                    x = origX + (origW - width);
                }
                if (edge.contains("n")) {
                    height = Math.max(MultiAppWindowState.MIN_H + MultiAppWindowState.TITLE_BAR_H, origH - dy);
                    y = origY + (origH - height);
                }
                listener.onResize(x, y, width, height);
                return true;
            default:
                return false;
        }
    }
}
