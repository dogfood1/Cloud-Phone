package com.yiyi.cloud_phone.workspace;

import org.json.JSONObject;

/** Group-control cast defaults aligned with web group-control-cast-options.js. */
public final class GroupCastOptions {
    public static final int TARGET_MAX_SIZE = 1920;
    public static final int TARGET_MAX_FPS = 30;
    public static final int VIDEO_BITRATE_MBPS = 4;

    private GroupCastOptions() {
    }

    public static JSONObject buildSettings() {
        JSONObject settings = CastSettingsDefaults.mirror();
        try {
            JSONObject video = settings.getJSONObject("video");
            video.put("maxFps", TARGET_MAX_FPS);
            video.put("bitRateMbps", VIDEO_BITRATE_MBPS);
            video.put("resolution", "1080p");
            video.put("iFrameInterval", 10);
            settings.getJSONObject("audio").put("disabled", true);
        } catch (Exception ignored) {
            // defaults only
        }
        return settings;
    }
}
