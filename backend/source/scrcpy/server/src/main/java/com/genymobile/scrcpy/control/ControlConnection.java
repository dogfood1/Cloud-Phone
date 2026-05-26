package com.genymobile.scrcpy.control;

import java.io.IOException;

/**
 * Control channel transport (ADB local socket or WebSocket-fed pipe).
 */
public interface ControlConnection {

    ControlMessage recv() throws IOException;

    void send(DeviceMessage msg) throws IOException;
}
