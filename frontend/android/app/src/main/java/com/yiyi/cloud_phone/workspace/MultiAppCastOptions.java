package com.yiyi.cloud_phone.workspace;

import com.yiyi.cloud_phone.cast.CastPayloadBuilder;

import org.json.JSONObject;

public final class MultiAppCastOptions {
    private MultiAppCastOptions() {
    }

    public static JSONObject buildSettings(
            String packageName,
            int vdWidth,
            int vdHeight,
            int vdDpi,
            int deviceSdk
    ) throws Exception {
        JSONObject settings = CastSettingsDefaults.mirror();
        JSONObject video = settings.getJSONObject("video");
        video.put("maxFps", 60);
        video.put("bitRateMbps", 8);
        video.put("iFrameInterval", 10);
        video.put("resolution", "1080p");

        JSONObject audio = settings.getJSONObject("audio");
        audio.put("disabled", true);

        JSONObject screen = settings.getJSONObject("screen");
        CastMirrorScreenUtils.applyNewDisplaySelect(screen, CastMirrorScreenUtils.NEW_DISPLAY_CUSTOM);
        CastJson.putInt(screen, "newDisplayWidth", vdWidth);
        CastJson.putInt(screen, "newDisplayHeight", vdHeight);
        CastJson.putInt(screen, "newDisplayDpi", vdDpi);
        CastJson.putBool(screen, "newDisplayDpiManual", true);
        CastJson.putText(screen, "newDisplayApp", packageName);
        CastJson.putBool(screen, "flexDisplay", true);
        CastJson.putBool(screen, "noVdDestroyContent", true);
        CastJson.putBool(screen, "noVdSystemDecorations", true);

        settings.put("deviceSdk", deviceSdk);
        return settings;
    }

    public static JSONObject buildPayload(
            String packageName,
            int vdWidth,
            int vdHeight,
            int vdDpi,
            int deviceSdk
    ) throws Exception {
        return CastPayloadBuilder.fromMirror(
                buildSettings(packageName, vdWidth, vdHeight, vdDpi, deviceSdk),
                deviceSdk
        );
    }

    public static byte[] buildStreamParams(
            String packageName,
            int vdWidth,
            int vdHeight,
            int vdDpi,
            int deviceSdk
    ) throws Exception {
        JSONObject payload = buildPayload(packageName, vdWidth, vdHeight, vdDpi, deviceSdk);
        return CastPayloadBuilder.streamParamsFromPayload(payload);
    }
}
