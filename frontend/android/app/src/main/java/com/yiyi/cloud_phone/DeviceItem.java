package com.yiyi.cloud_phone;

import org.json.JSONObject;

public final class DeviceItem {
    public final String serial;
    public final String state;
    public final boolean connected;
    public final String product;
    public final String model;
    public final String device;
    public final String manufacturer;
    public final String androidVersion;
    public final String sdkVersion;
    public final String ipAddress;
    public final String displayName;
    public final boolean wireless;
    public final String platform;

    DeviceItem(JSONObject json) {
        serial = json.optString("serial", "");
        state = json.optString("state", "");
        connected = json.optBoolean("connected", false);
        product = json.optString("product", "");
        model = json.optString("model", "");
        device = json.optString("device", "");
        manufacturer = json.optString("manufacturer", "");
        androidVersion = json.optString("androidVersion", "");
        sdkVersion = json.optString("sdkVersion", "");
        ipAddress = json.optString("ipAddress", "");
        displayName = json.optString("displayName", serial);
        wireless = json.has("wireless")
                ? json.optBoolean("wireless", false)
                : DeviceTransport.isWirelessSerial(serial);
        platform = json.optString("platform", "android");
    }
}
