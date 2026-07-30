package com.yiyi.cloud_phone.multiapp;

import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewParent;

/** Title-bar drag; keeps gesture state even when the finger leaves the title. */
final class MultiAppTitleDragListener implements View.OnTouchListener {
    interface Host {
        void onFocus();

        void onMove(int x, int y);

        void onToggleMaximize();
    }

    private final MultiAppWindowState win;
    private final Host host;
    private final GestureDetector gestureDetector;
    private boolean dragging;
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
                dragging = true;
                startX = event.getRawX();
                startY = event.getRawY();
                origX = win.x;
                origY = win.y;
                disallowParentIntercept(v, true);
                return true;
            case MotionEvent.ACTION_MOVE:
                if (!dragging) {
                    return false;
                }
                int dx = Math.round(event.getRawX() - startX);
                int dy = Math.round(event.getRawY() - startY);
                host.onMove(origX + dx, origY + dy);
                return true;
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_CANCEL:
                dragging = false;
                disallowParentIntercept(v, false);
                return true;
            default:
                return false;
        }
    }

    private static void disallowParentIntercept(View v, boolean disallow) {
        ViewParent parent = v.getParent();
        if (parent != null) {
            parent.requestDisallowInterceptTouchEvent(disallow);
        }
    }
}
