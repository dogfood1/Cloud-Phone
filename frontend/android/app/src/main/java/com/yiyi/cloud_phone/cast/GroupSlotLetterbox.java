package com.yiyi.cloud_phone.cast;

import android.view.TextureView;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;

/** Contain-fit letterbox for group-slot TextureViews (black bars, no stretch). */
final class GroupSlotLetterbox {
    private GroupSlotLetterbox() {
    }

    static void apply(TextureView texture, int videoWidth, int videoHeight) {
        if (texture == null || videoWidth <= 0 || videoHeight <= 0) {
            return;
        }
        View parent = (View) texture.getParent();
        if (!(parent instanceof FrameLayout)) {
            return;
        }
        Runnable apply = () -> CastSurfaceLayout.applyLetterbox(
                (FrameLayout) parent,
                texture,
                videoWidth,
                videoHeight,
                0
        );
        if (parent.getWidth() > 0 && parent.getHeight() > 0) {
            apply.run();
        } else {
            parent.post(apply);
        }
    }

    static void reset(TextureView texture) {
        if (texture == null) {
            return;
        }
        ViewGroup.LayoutParams params = texture.getLayoutParams();
        if (params != null) {
            params.width = ViewGroup.LayoutParams.MATCH_PARENT;
            params.height = ViewGroup.LayoutParams.MATCH_PARENT;
            if (params instanceof FrameLayout.LayoutParams) {
                ((FrameLayout.LayoutParams) params).gravity = android.view.Gravity.CENTER;
            }
            texture.setLayoutParams(params);
        }
        texture.setRotation(0f);
        texture.setTransform(new android.graphics.Matrix());
    }
}
