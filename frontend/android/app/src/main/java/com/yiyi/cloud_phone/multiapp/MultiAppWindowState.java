package com.yiyi.cloud_phone.multiapp;

public final class MultiAppWindowState {
    public static final int TITLE_BAR_H = 36;
    public static final int MIN_W = 240;
    public static final int MIN_H = 320;

    public final String id;
    public final String packageName;
    public String label;
    public String orientation;
    public String iconDataUrl;
    public String activity;
    public int vdWidth;
    public int vdHeight;
    public int vdDpi;
    public int x;
    public int y;
    public int width;
    public int height;
    public boolean minimized;
    public boolean maximized;
    public int zIndex;
    public int restoreX;
    public int restoreY;
    public int restoreW;
    public int restoreH;
    public boolean hasRestore;

    public MultiAppWindowState(
            String id,
            String packageName,
            String label,
            String orientation,
            int vdWidth,
            int vdHeight,
            int vdDpi,
            int x,
            int y,
            int width,
            int height,
            int zIndex
    ) {
        this.id = id;
        this.packageName = packageName;
        this.label = label;
        this.orientation = orientation;
        this.vdWidth = vdWidth;
        this.vdHeight = vdHeight;
        this.vdDpi = vdDpi;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.zIndex = zIndex;
    }

    public int contentWidth() {
        return Math.max(1, width);
    }

    public int contentHeight() {
        return Math.max(1, height - TITLE_BAR_H);
    }
}
