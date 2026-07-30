package com.yiyi.cloud_phone.cast;

import android.graphics.SurfaceTexture;
import android.view.Surface;
import android.view.TextureView;

/** Binds a TextureView surface to the group-slot decoder without forcing reconnect. */
final class GroupSlotSurfaceBinder {
    interface Host {
        void onSurfaceReady();

        void onSurfaceLost();

        void onSurfaceSized();

        void attachDecoder(Surface surface, SurfaceTexture texture);
    }

    private GroupSlotSurfaceBinder() {
    }

    static void bind(TextureView view, Host host) {
        if (view == null || host == null) {
            return;
        }
        view.setSurfaceTextureListener(new TextureView.SurfaceTextureListener() {
            @Override
            public void onSurfaceTextureAvailable(SurfaceTexture surface, int w, int h) {
                host.attachDecoder(new Surface(surface), surface);
                host.onSurfaceReady();
            }

            @Override
            public void onSurfaceTextureSizeChanged(SurfaceTexture surface, int w, int h) {
                host.onSurfaceSized();
            }

            @Override
            public boolean onSurfaceTextureDestroyed(SurfaceTexture surface) {
                host.onSurfaceLost();
                return true;
            }

            @Override
            public void onSurfaceTextureUpdated(SurfaceTexture surface) {
            }
        });
        if (view.isAvailable()) {
            host.attachDecoder(new Surface(view.getSurfaceTexture()), view.getSurfaceTexture());
            host.onSurfaceReady();
        }
    }
}
