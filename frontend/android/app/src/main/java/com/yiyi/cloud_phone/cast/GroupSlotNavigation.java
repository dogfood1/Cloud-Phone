package com.yiyi.cloud_phone.cast;

/** Navigation / power helpers for group-slot control channel. */
final class GroupSlotNavigation {
    private GroupSlotNavigation() {
    }

    static void send(CastWebSocketSession webSocketSession, String actionId) {
        if (actionId == null || webSocketSession == null) {
            return;
        }
        if ("screen-on".equals(actionId)) {
            webSocketSession.sendControl(ScrcpyControlWire.setScreenPower(true));
            byte[] wake = ScrcpyControlWire.navigationTap("power");
            if (wake != null) {
                webSocketSession.sendControl(wake);
            }
            return;
        }
        if ("screen-off".equals(actionId)) {
            webSocketSession.sendControl(ScrcpyControlWire.setScreenPower(false));
            return;
        }
        byte[] payload = ScrcpyControlWire.navigationTap(actionId);
        if (payload != null) {
            webSocketSession.sendControl(payload);
        }
    }
}
