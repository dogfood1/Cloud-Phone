package com.yiyi.cloud_phone.group;

import android.graphics.Bitmap;

class GroupDevice {
    enum CastState { IDLE, STARTING, STREAMING, ERROR }

    final String serial;
    final String displayName;
    boolean active;
    boolean isMaster;
    CastState castState = CastState.IDLE;
    Bitmap screenshot;
    String errorMessage;

    GroupDevice(String serial, String displayName) {
        this.serial = serial;
        this.displayName = displayName;
        this.active = true;
    }
}
