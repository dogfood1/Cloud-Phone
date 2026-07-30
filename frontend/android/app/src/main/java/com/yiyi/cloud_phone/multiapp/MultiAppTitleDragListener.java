package com.yiyi.cloud_phone.multiapp;

import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.View;

final class MultiAppTitleDragListener implements View.OnTouchListener {
    interface Host {
        void onFocus();

        void onMove(int x, int y);

        void onToggleMaximize();
    }

    private final MultiAppWindowState win;
    private final Host host;
    private final GestureDetector gestureDetector;
    private float startX;
    private float startY;
    private int origX;
    private int origY;

    MultiAppTitleDragListener(MultiAppWindowState win, Host host, android.content.Context context) {
        this.win = win;
        this.host = host;
        this.gestureDetector = new GestureDetector(context, new GestureDetector.SimpleOnGestureListener() {
            @Override
            public boolean onDoubleTap(MotionEvent e) {
                host.onToggleMaximize();
                return true;
            }
        });
    }

    @Override
    public boolean onTouch(View v, MotionEvent event) {
        gestureDetector.onTouchEvent(event);
        if (win.maximized) {
            return false;
        }
        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                host.onFocus();
                startX = event.getRawX();
                startY = event.getRawY();
                origX = win.x;
                origY = win.y;
                return true;
            case MotionEvent.ACTION_MOVE:
                int dx = Math.round(event.getRawX() - startX);
                int dy = Math.round(event.getRawY() - startY);
                host.onMove(origX + dx, origY + dy);
                return true;
            default:
                return false;
        }
    }
}
