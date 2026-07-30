package com.yiyi.cloud_phone.multiapp;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.widget.ImageView;
import android.widget.TextView;

import java.util.Locale;

final class MultiAppIconUtil {
    private MultiAppIconUtil() {
    }

    static void bindIcon(ImageView imageView, TextView fallback, String label, String iconDataUrl) {
        if (iconDataUrl != null && !iconDataUrl.isEmpty()) {
            Bitmap bitmap = decodeDataUrl(iconDataUrl);
            if (bitmap != null) {
                imageView.setImageBitmap(bitmap);
                imageView.setVisibility(android.view.View.VISIBLE);
                fallback.setVisibility(android.view.View.GONE);
                return;
            }
        }
        imageView.setVisibility(android.view.View.GONE);
        fallback.setVisibility(android.view.View.VISIBLE);
        String text = initials(label);
        fallback.setText(text);
        GradientDrawable bg = new GradientDrawable();
        bg.setCornerRadius(8f);
        bg.setColor(colorFromSeed(label));
        fallback.setBackground(bg);
    }

    static String initials(String label) {
        String trimmed = label == null ? "" : label.trim();
        if (trimmed.isEmpty()) {
            return "?";
        }
        return trimmed.substring(0, 1).toUpperCase(Locale.ROOT);
    }

    private static Bitmap decodeDataUrl(String dataUrl) {
        try {
            int comma = dataUrl.indexOf(',');
            if (comma < 0) {
                return null;
            }
            byte[] bytes = android.util.Base64.decode(dataUrl.substring(comma + 1), android.util.Base64.DEFAULT);
            return BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        } catch (Exception ignored) {
            return null;
        }
    }

    private static int colorFromSeed(String seed) {
        int hash = seed == null ? 0 : seed.hashCode();
        float hue = (hash & 0xff) * 360f / 255f;
        return Color.HSVToColor(new float[] { hue, 0.35f, 0.92f });
    }
}
