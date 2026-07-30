package com.yiyi.cloud_phone.multiapp;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.PopupWindow;

import androidx.appcompat.app.AppCompatActivity;

final class MultiAppFlyoutPopup {
    private static PopupWindow current;

    private MultiAppFlyoutPopup() {
    }

    static void dismissCurrent() {
        if (current != null) {
            try {
                current.dismiss();
            } catch (Exception ignored) {
            }
            current = null;
        }
    }

    static int fitWidth(AppCompatActivity activity, float preferredDp) {
        int screenW = activity.getResources().getDisplayMetrics().widthPixels;
        return Math.min(dp(activity, preferredDp), screenW - dp(activity, 16));
    }

    /** Max height that still fits above the taskbar/anchor. */
    static int maxHeightAbove(AppCompatActivity activity, View anchor) {
        int[] loc = new int[2];
        anchor.getLocationOnScreen(loc);
        int screenH = activity.getResources().getDisplayMetrics().heightPixels;
        int above = loc[1] - dp(activity, 12);
        int below = screenH - (loc[1] + anchor.getHeight()) - dp(activity, 12);
        int best = Math.max(above, below);
        return Math.max(dp(activity, 180), Math.min(best, Math.round(screenH * 0.78f)));
    }

    static PopupWindow showAbove(AppCompatActivity activity, View anchor, View content, int widthPx, int heightPx) {
        return show(activity, anchor, content, widthPx, heightPx, false);
    }

    static PopupWindow showAboveEnd(AppCompatActivity activity, View anchor, View content, int widthPx, int heightPx) {
        return show(activity, anchor, content, widthPx, heightPx, true);
    }

    private static PopupWindow show(
            AppCompatActivity activity,
            View anchor,
            View content,
            int widthPx,
            int heightPx,
            boolean alignEnd
    ) {
        dismissCurrent();
        int maxH = maxHeightAbove(activity, anchor);
        int limitH = heightPx > 0 ? Math.min(heightPx, maxH) : maxH;
        content.setLayoutParams(new ViewGroup.LayoutParams(widthPx, ViewGroup.LayoutParams.WRAP_CONTENT));
        content.measure(
                View.MeasureSpec.makeMeasureSpec(widthPx, View.MeasureSpec.EXACTLY),
                View.MeasureSpec.makeMeasureSpec(limitH, View.MeasureSpec.AT_MOST)
        );
        int popupW = widthPx;
        int measured = Math.max(content.getMeasuredHeight(), 1);
        int popupH = Math.min(measured, limitH);
        if (popupH < measured) {
            // Force scrollable roots to fill capped height.
            content.setLayoutParams(new ViewGroup.LayoutParams(widthPx, popupH));
            content.measure(
                    View.MeasureSpec.makeMeasureSpec(widthPx, View.MeasureSpec.EXACTLY),
                    View.MeasureSpec.makeMeasureSpec(popupH, View.MeasureSpec.EXACTLY)
            );
        }
        PopupWindow popup = new PopupWindow(content, popupW, popupH, true);
        popup.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        popup.setOutsideTouchable(true);
        popup.setFocusable(true);
        popup.setElevation(dp(activity, 18));
        popup.setClippingEnabled(true);
        popup.setOnDismissListener(() -> {
            if (current == popup) {
                current = null;
            }
        });
        current = popup;

        int[] loc = new int[2];
        anchor.getLocationOnScreen(loc);
        int screenW = activity.getResources().getDisplayMetrics().widthPixels;
        int x;
        if (alignEnd) {
            x = loc[0] + anchor.getWidth() - popupW;
        } else {
            x = loc[0] + (anchor.getWidth() / 2) - (popupW / 2);
        }
        x = Math.max(dp(activity, 8), Math.min(x, screenW - popupW - dp(activity, 8)));

        int y = loc[1] - popupH - dp(activity, 8);
        if (y < dp(activity, 8)) {
            y = loc[1] + anchor.getHeight() + dp(activity, 8);
            int screenH = activity.getResources().getDisplayMetrics().heightPixels;
            if (y + popupH > screenH - dp(activity, 8)) {
                popupH = Math.max(dp(activity, 160), screenH - y - dp(activity, 8));
                popup.update(popupW, popupH);
                content.setLayoutParams(new ViewGroup.LayoutParams(widthPx, popupH));
            }
        }
        popup.showAtLocation(anchor, Gravity.NO_GRAVITY, x, y);
        return popup;
    }

    static int dp(AppCompatActivity activity, float value) {
        return Math.round(value * activity.getResources().getDisplayMetrics().density);
    }
}
