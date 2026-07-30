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

    static PopupWindow showAbove(AppCompatActivity activity, View anchor, View content, int widthPx, int heightPx) {
        dismissCurrent();
        content.measure(
                View.MeasureSpec.makeMeasureSpec(widthPx, View.MeasureSpec.EXACTLY),
                heightPx > 0
                        ? View.MeasureSpec.makeMeasureSpec(heightPx, View.MeasureSpec.AT_MOST)
                        : View.MeasureSpec.makeMeasureSpec(
                        activity.getResources().getDisplayMetrics().heightPixels,
                        View.MeasureSpec.AT_MOST)
        );
        if (content.getLayoutParams() == null) {
            content.setLayoutParams(new ViewGroup.LayoutParams(widthPx, ViewGroup.LayoutParams.WRAP_CONTENT));
        }
        int popupW = widthPx;
        int measured = content.getMeasuredHeight();
        int popupH = heightPx > 0 ? Math.min(heightPx, Math.max(measured, 1)) : Math.max(measured, 1);
        PopupWindow popup = new PopupWindow(content, popupW, popupH, true);
        popup.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        popup.setOutsideTouchable(true);
        popup.setFocusable(true);
        popup.setElevation(dp(activity, 18));
        popup.setOnDismissListener(() -> {
            if (current == popup) {
                current = null;
            }
        });
        current = popup;
        int[] loc = new int[2];
        anchor.getLocationOnScreen(loc);
        int x = loc[0] + (anchor.getWidth() / 2) - (popupW / 2);
        int screenW = activity.getResources().getDisplayMetrics().widthPixels;
        x = Math.max(dp(activity, 8), Math.min(x, screenW - popupW - dp(activity, 8)));
        int measuredH = popupH;
        int y = loc[1] - measuredH - dp(activity, 8);
        if (y < dp(activity, 8)) {
            y = loc[1] + anchor.getHeight() + dp(activity, 8);
        }
        popup.showAtLocation(anchor, Gravity.NO_GRAVITY, x, y);
        return popup;
    }

    static PopupWindow showAboveEnd(AppCompatActivity activity, View anchor, View content, int widthPx, int heightPx) {
        dismissCurrent();
        content.measure(
                View.MeasureSpec.makeMeasureSpec(widthPx, View.MeasureSpec.EXACTLY),
                heightPx > 0
                        ? View.MeasureSpec.makeMeasureSpec(heightPx, View.MeasureSpec.AT_MOST)
                        : View.MeasureSpec.makeMeasureSpec(
                        activity.getResources().getDisplayMetrics().heightPixels,
                        View.MeasureSpec.AT_MOST)
        );
        if (content.getLayoutParams() == null) {
            content.setLayoutParams(new ViewGroup.LayoutParams(widthPx, ViewGroup.LayoutParams.WRAP_CONTENT));
        }
        int popupW = widthPx;
        int measured = content.getMeasuredHeight();
        int popupH = heightPx > 0 ? Math.min(heightPx, Math.max(measured, 1)) : Math.max(measured, 1);
        PopupWindow popup = new PopupWindow(content, popupW, popupH, true);
        popup.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        popup.setOutsideTouchable(true);
        popup.setFocusable(true);
        popup.setElevation(dp(activity, 18));
        popup.setOnDismissListener(() -> {
            if (current == popup) {
                current = null;
            }
        });
        current = popup;
        int[] loc = new int[2];
        anchor.getLocationOnScreen(loc);
        int screenW = activity.getResources().getDisplayMetrics().widthPixels;
        int x = loc[0] + anchor.getWidth() - popupW;
        x = Math.max(dp(activity, 8), Math.min(x, screenW - popupW - dp(activity, 8)));
        int measuredH = popupH;
        int y = loc[1] - measuredH - dp(activity, 8);
        if (y < dp(activity, 8)) {
            y = loc[1] + anchor.getHeight() + dp(activity, 8);
        }
        popup.showAtLocation(anchor, Gravity.NO_GRAVITY, x, y);
        return popup;
    }

    static int dp(AppCompatActivity activity, float value) {
        return Math.round(value * activity.getResources().getDisplayMetrics().density);
    }
}
