package com.yiyi.cloud_phone.logs;

public final class LogEntry {
    public final long id;
    public final long timestamp;
    public final String displayTime;
    public final String level;
    public final String category;
    public final String event;
    public final String message;
    public final String deviceSerial;
    public final String deviceName;

    LogEntry(long id, long timestamp, String displayTime, String level, String category,
             String event, String message, String deviceSerial, String deviceName) {
        this.id = id;
        this.timestamp = timestamp;
        this.displayTime = displayTime;
        this.level = level;
        this.category = category;
        this.event = event;
        this.message = message;
        this.deviceSerial = deviceSerial;
        this.deviceName = deviceName;
    }
}
