package com.yiyi.cloud_phone.cast;

final class CastVdErrorHelper {
    private CastVdErrorHelper() {
    }

    static boolean isVirtualDisplayError(String text) {
        String lower = String.valueOf(text).toLowerCase();
        return lower.contains("virtual_display")
                || lower.contains("add_trusted_display")
                || lower.contains("could not create display")
                || lower.contains("could not create virtual display")
                || lower.contains("trusted virtual display");
    }

    static String formatUserMessage(String detail) {
        String base =
                "当前设备系统不允许创建虚拟显示（常见于 Android 15 / 部分华为等机型缺少 ADD_TRUSTED_DISPLAY 权限）。"
                        + "多应用独立窗口依赖虚拟屏，因此无法在此设备上使用。";
        String trimmed = detail == null ? "" : detail.trim();
        if (trimmed.isEmpty()) {
            return base;
        }
        if (trimmed.contains("当前设备系统不允许创建虚拟显示")) {
            return trimmed;
        }
        return base + "\n\n技术详情：" + trimmed;
    }
}
