package com.yiyi.cloud_phone;

final class DeviceTransport {
    private DeviceTransport() {
    }

    static boolean isWirelessSerial(String serial) {
        if (serial == null || serial.isEmpty()) {
            return false;
        }
        if (serial.startsWith("emulator-")) {
            return false;
        }
        int colon = serial.lastIndexOf(':');
        if (colon <= 0 || colon >= serial.length() - 1) {
            return false;
        }
        try {
            int port = Integer.parseInt(serial.substring(colon + 1));
            return port >= 1 && port <= 65535;
        } catch (NumberFormatException error) {
            return false;
        }
    }
}
