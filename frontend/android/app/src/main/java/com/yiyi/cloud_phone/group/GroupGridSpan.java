package com.yiyi.cloud_phone.group;

/** Responsive column count aligned with Web group-control grid breakpoints. */
final class GroupGridSpan {
    private GroupGridSpan() {
    }

    static int columns(int widthPx, float density) {
        int widthDp = Math.max(1, Math.round(widthPx / density));
        int minCellDp;
        if (widthDp >= 900) {
            minCellDp = 220;
        } else if (widthDp >= 600) {
            minCellDp = 200;
        } else {
            minCellDp = 168;
        }
        return Math.max(1, widthDp / minCellDp);
    }
}
