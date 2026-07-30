package com.yiyi.cloud_phone.workspace;

public enum CastMode {
    MIRROR("mirror"),
    MULTI_APP("multiApp"),
    CAMERA("camera");

    public final String id;

    CastMode(String id) {
        this.id = id;
    }

    public static CastMode fromId(String id) {
        if (CAMERA.id.equals(id)) {
            return CAMERA;
        }
        if (MULTI_APP.id.equals(id)) {
            return MULTI_APP;
        }
        return MIRROR;
    }
}
