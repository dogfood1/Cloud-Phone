package com.yiyi.cloud_phone.multiapp;

import com.yiyi.cloud_phone.workspace.CastMirrorScreenUtils;

final class MultiAppWindowLayout {
    static final int TASKBAR_H = 48;
    private static final int EDGE_GAP = 8;

    private MultiAppWindowLayout() {
    }

    static final class VdSize {
        final int width;
        final int height;

        VdSize(int width, int height) {
            this.width = width;
            this.height = height;
        }
    }

    static final class Bounds {
        final int x;
        final int y;
        final int width;
        final int height;
        final int vdWidth;
        final int vdHeight;
        final int vdDpi;

        Bounds(int x, int y, int width, int height, int vdWidth, int vdHeight, int vdDpi) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.vdWidth = vdWidth;
            this.vdHeight = vdHeight;
            this.vdDpi = vdDpi;
        }
    }

    static VdSize resolveVdSize(String orientation) {
        if ("landscape".equals(orientation)) {
            return new VdSize(1920, 1080);
        }
        return new VdSize(1080, 1920);
    }

    static Bounds defaultWindowBounds(int canvasW, int canvasH, int windowIndex, String orientation) {
        int availH = Math.max(MultiAppWindowState.MIN_H + MultiAppWindowState.titleBarHeight(), canvasH);
        int availW = Math.max(MultiAppWindowState.MIN_W, canvasW - EDGE_GAP * 2);
        VdSize vd = resolveVdSize(orientation);
        float aspect = vd.width / (float) vd.height;

        int height = availH;
        int contentH = Math.max(MultiAppWindowState.MIN_H, height - MultiAppWindowState.titleBarHeight());
        int width = Math.round(contentH * aspect);
        if (width > availW) {
            width = availW;
            contentH = Math.round(width / aspect);
            height = contentH + MultiAppWindowState.titleBarHeight();
        }
        width = Math.max(MultiAppWindowState.MIN_W, width);
        height = Math.max(
                MultiAppWindowState.MIN_H + MultiAppWindowState.titleBarHeight(),
                Math.min(availH, height)
        );

        int offset = (Math.max(0, windowIndex) % 5) * 24;
        int x = Math.max(
                EDGE_GAP,
                Math.min(canvasW - width - EDGE_GAP, Math.round((canvasW - width) / 2f) + offset)
        );
        int y = Math.max(0, Math.min(EDGE_GAP + (offset % 12), Math.max(0, availH - height)));
        int dpi = CastMirrorScreenUtils.suggestDpi(vd.width, vd.height);
        return new Bounds(x, y, width, height, vd.width, vd.height, dpi);
    }

    static VdSize resolveVdFromContent(int contentW, int contentH) {
        int cw = Math.max(1, contentW);
        int ch = Math.max(1, contentH);
        float aspect = cw / (float) ch;
        if (aspect >= 1f) {
            int width = 1920;
            int height = Math.max(320, alignEven(Math.round(width / aspect)));
            return new VdSize(width, height);
        }
        int height = 1920;
        int width = Math.max(240, alignEven(Math.round(height * aspect)));
        return new VdSize(width, height);
    }

    static int suggestDpiForContent(int contentW, int contentH) {
        VdSize vd = resolveVdFromContent(contentW, contentH);
        return CastMirrorScreenUtils.suggestDpi(vd.width, vd.height);
    }

    private static int alignEven(int value) {
        int n = Math.max(1, value);
        return n & ~1;
    }
}
