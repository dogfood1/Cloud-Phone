package com.yiyi.cloud_phone;

import android.content.Context;
import android.content.res.ColorStateList;
import android.util.TypedValue;

import androidx.annotation.ColorRes;
import androidx.core.content.ContextCompat;

import com.mikepenz.iconics.IconicsDrawable;

public final class AppIcons {
    private AppIcons() {
    }

    private static int toPx(Context context, int dp) {
        return Math.round(TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                dp,
                context.getResources().getDisplayMetrics()
        ));
    }

    private static void applySize(IconicsDrawable drawable, Context context, int sizeDp) {
        int px = toPx(context, sizeDp);
        drawable.setSizeXPx(px);
        drawable.setSizeYPx(px);
    }

    public static IconicsDrawable drawable(
            Context context,
            String iconKey,
            @ColorRes int colorRes,
            int sizeDp
    ) {
        IconicsDrawable drawable = new IconicsDrawable(context, iconKey);
        drawable.setColorList(ColorStateList.valueOf(ContextCompat.getColor(context, colorRes)));
        applySize(drawable, context, sizeDp);
        return drawable;
    }

    private static IconicsDrawable navIcon(Context context, String iconKey) {
        IconicsDrawable drawable = new IconicsDrawable(context, iconKey);
        drawable.setColorList(ContextCompat.getColorStateList(context, R.color.console_nav_item));
        applySize(drawable, context, 22);
        return drawable;
    }

    public static IconicsDrawable addDevice(Context context) {
        return drawable(context, "cmd_plus", R.color.auth_primary_text, 22);
    }

    public static IconicsDrawable close(Context context) {
        return drawable(context, "cmd_close", R.color.auth_text_secondary, 22);
    }

    public static IconicsDrawable devicePlaceholder(Context context) {
        return drawable(context, "cmd_cellphone", R.color.auth_text_secondary, 28);
    }

    public static IconicsDrawable tabDevices(Context context) {
        return navIcon(context, "cmd_cellphone_link");
    }

    public static IconicsDrawable tabGroup(Context context) {
        return navIcon(context, "cmd_account_group");
    }

    public static IconicsDrawable tabLogs(Context context) {
        return navIcon(context, "cmd_format_list_bulleted");
    }

    public static IconicsDrawable tabSettings(Context context) {
        return navIcon(context, "cmd_cog");
    }

    public static IconicsDrawable androidPlatform(Context context) {
        return drawable(context, "cmd_android", R.color.auth_text_primary, 28);
    }

    public static IconicsDrawable harmonyPlatform(Context context) {
        return drawable(context, "cmd_cellphone", R.color.auth_text_primary, 28);
    }

    public static IconicsDrawable iosPlatform(Context context) {
        return drawable(context, "cmd_apple", R.color.auth_text_primary, 28);
    }

    public static IconicsDrawable modeUsb(Context context) {
        return drawable(context, "cmd_usb", R.color.auth_text_primary, 20);
    }

    public static IconicsDrawable modePairCode(Context context) {
        return drawable(context, "cmd_key_variant", R.color.auth_text_primary, 20);
    }

    public static IconicsDrawable modeQr(Context context) {
        return drawable(context, "cmd_qrcode", R.color.auth_text_primary, 20);
    }

    public static IconicsDrawable modeDirect(Context context) {
        return drawable(context, "cmd_lan_connect", R.color.auth_text_primary, 20);
    }

    public static IconicsDrawable back(Context context) {
        return drawable(context, "cmd_arrow_left", R.color.auth_text_primary, 24);
    }

    public static IconicsDrawable settingsAccount(Context context) {
        return drawable(context, "cmd_account_circle", R.color.auth_primary, 20);
    }

    public static IconicsDrawable settingsAppearance(Context context) {
        return drawable(context, "cmd_palette", R.color.auth_primary, 20);
    }

    public static IconicsDrawable settingsRefresh(Context context) {
        return drawable(context, "cmd_refresh", R.color.auth_primary, 20);
    }

    public static IconicsDrawable settingsServer(Context context) {
        return drawable(context, "cmd_server", R.color.auth_primary, 20);
    }

    // File Explorer icons
    public static IconicsDrawable fileFolder(Context context) {
        return drawable(context, "cmd_folder", R.color.auth_text_secondary, 20);
    }

    public static IconicsDrawable fileFile(Context context) {
        return drawable(context, "cmd_file_outline", R.color.auth_text_secondary, 20);
    }

    public static IconicsDrawable fileSymlink(Context context) {
        return drawable(context, "cmd_link_variant", R.color.auth_text_secondary, 20);
    }

    public static IconicsDrawable navBack(Context context) {
        return drawable(context, "cmd_arrow_left", R.color.auth_text_primary, 22);
    }

    public static IconicsDrawable navForward(Context context) {
        return drawable(context, "cmd_arrow_right", R.color.auth_text_primary, 22);
    }

    public static IconicsDrawable navUp(Context context) {
        return drawable(context, "cmd_arrow_up_bold", R.color.auth_text_primary, 22);
    }

    public static IconicsDrawable navRefresh(Context context) {
        return drawable(context, "cmd_refresh", R.color.auth_text_primary, 22);
    }

    public static IconicsDrawable navUpload(Context context) {
        return drawable(context, "cmd_upload", R.color.auth_text_primary, 22);
    }

    public static IconicsDrawable download(Context context) {
        return drawable(context, "cmd_download", R.color.auth_primary, 18);
    }

    public static IconicsDrawable install(Context context) {
        return drawable(context, "cmd_package_down", R.color.auth_primary, 20);
    }

    // App Manager icons
    public static IconicsDrawable workspaceFiles(Context context) {
        return drawable(context, "cmd_folder_outline", R.color.auth_text_primary, 20);
    }

    public static IconicsDrawable workspaceApps(Context context) {
        return drawable(context, "cmd_apps", R.color.auth_text_primary, 20);
    }

    public static IconicsDrawable workspaceTerminal(Context context) {
        return drawable(context, "cmd_console", R.color.auth_text_primary, 20);
    }

    public static IconicsDrawable overflowMenu(Context context) {
        return drawable(context, "cmd_dots_vertical", R.color.auth_text_primary, 22);
    }

    public static IconicsDrawable chevronDown(Context context) {
        return drawable(context, "cmd_chevron_down", R.color.auth_text_secondary, 16);
    }

    // Group Control icons
    public static IconicsDrawable powerIcon(Context context) {
        return drawable(context, "cmd_power", R.color.auth_text_primary, 20);
    }

    public static IconicsDrawable volumeIcon(Context context) {
        return drawable(context, "cmd_volume_high", R.color.auth_text_primary, 20);
    }

    public static IconicsDrawable groupAppsIcon(Context context) {
        return drawable(context, "cmd_apps", R.color.auth_text_primary, 20);
    }

    public static IconicsDrawable groupBatchIcon(Context context) {
        return drawable(context, "cmd_account_group", R.color.auth_text_primary, 20);
    }
}
