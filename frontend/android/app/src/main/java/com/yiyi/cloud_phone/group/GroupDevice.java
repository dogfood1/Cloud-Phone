package com.yiyi.cloud_phone.group;

class GroupDevice {
    enum CastState { IDLE, STARTING, STREAMING, ERROR }

    final String serial;
    final String displayName;
    final int sdkVersion;
    boolean active;
    boolean isMaster;
    CastState castState = CastState.IDLE;
    String errorMessage;
    String startupLog = "";
    boolean showLogs;

    GroupDevice(String serial, String displayName, int sdkVersion) {
        this.serial = serial;
        this.displayName = displayName;
        this.sdkVersion = sdkVersion;
        this.active = true;
    }
}
