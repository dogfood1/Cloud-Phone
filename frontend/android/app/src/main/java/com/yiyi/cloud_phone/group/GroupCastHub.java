package com.yiyi.cloud_phone.group;

import android.content.Context;
import android.view.TextureView;

import com.yiyi.cloud_phone.cast.GroupSlotCastSession;
import com.yiyi.cloud_phone.cast.ScrcpyControlWire;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Owns per-slot cast sessions for the group-control grid. */
final class GroupCastHub {
    interface Listener {
        void onDeviceUi(GroupDevice device);
    }

    private final Context context;
    private final Map<String, GroupSlotCastSession> sessions = new HashMap<>();
    private Listener listener;
    private boolean batchMode;
    private String masterSerial;

    GroupCastHub(Context context) {
        this.context = context.getApplicationContext();
    }

    void setListener(Listener listener) {
        this.listener = listener;
    }

    void setBatchMode(boolean batchMode, String masterSerial) {
        this.batchMode = batchMode;
        this.masterSerial = masterSerial;
    }

    void sync(List<GroupDevice> devices) {
        Set<String> keep = new HashSet<>();
        for (GroupDevice device : devices) {
            keep.add(device.serial);
            if (device.active) {
                ensureStarted(device);
            } else {
                stopDevice(device.serial, true);
                device.castState = GroupDevice.CastState.IDLE;
                device.startupLog = "";
                device.showLogs = false;
                device.errorMessage = null;
            }
        }
        Set<String> known = new HashSet<>(sessions.keySet());
        for (String serial : known) {
            if (!keep.contains(serial)) {
                stopDevice(serial, true);
            }
        }
    }

    void bind(GroupDevice device, TextureView texture) {
        GroupSlotCastSession session = sessions.get(device.serial);
        if (session == null) {
            return;
        }
        session.bindTexture(texture);
        GroupSlotTouchBinder.attach(texture, device.serial, session, this::canControl);
    }

    void unbind(GroupDevice device, TextureView texture) {
        GroupSlotTouchBinder.detach(texture);
        GroupSlotCastSession session = sessions.get(device.serial);
        if (session != null) {
            session.unbindTexture(texture);
        }
    }

    void broadcastNavigation(List<GroupDevice> devices, String actionId) {
        for (GroupDevice device : devices) {
            if (!device.active) {
                continue;
            }
            GroupSlotCastSession session = sessions.get(device.serial);
            if (session != null) {
                session.sendNavigation(actionId);
            }
        }
    }

    void releaseAll() {
        for (GroupSlotCastSession session : sessions.values()) {
            session.release();
        }
        sessions.clear();
    }

    private boolean canControl(String serial) {
        if (!batchMode) {
            return true;
        }
        return masterSerial != null && masterSerial.equals(serial);
    }

    private void ensureStarted(GroupDevice device) {
        GroupSlotCastSession session = sessions.get(device.serial);
        if (session == null) {
            session = new GroupSlotCastSession(context, device.serial, device.sdkVersion);
            sessions.put(device.serial, session);
            GroupDevice target = device;
            session.setUiCallback((state, logText, error, showLogs) -> {
                target.startupLog = logText;
                target.showLogs = showLogs;
                target.errorMessage = error == null || error.isEmpty() ? null : error;
                target.castState = mapState(state);
                if (listener != null) {
                    listener.onDeviceUi(target);
                }
            });
            String sourceSerial = device.serial;
            session.setControlRelay((serial, payload, videoW, videoH) ->
                    relayControl(sourceSerial, payload, videoW, videoH));
        }
        session.start();
    }

    private void relayControl(String sourceSerial, byte[] payload, int fromW, int fromH) {
        if (!batchMode || masterSerial == null || !masterSerial.equals(sourceSerial) || payload == null) {
            return;
        }
        for (Map.Entry<String, GroupSlotCastSession> entry : sessions.entrySet()) {
            if (entry.getKey().equals(sourceSerial)) {
                continue;
            }
            GroupSlotCastSession follower = entry.getValue();
            if (!follower.isStreaming()) {
                continue;
            }
            byte[] relayed = remapTouch(payload, fromW, fromH, follower.getVideoWidth(), follower.getVideoHeight());
            if (relayed != null) {
                follower.sendControl(relayed);
            }
        }
    }

    private static byte[] remapTouch(byte[] payload, int fromW, int fromH, int toW, int toH) {
        if (payload.length < 32 || payload[0] != 2 || toW <= 0 || toH <= 0) {
            return payload;
        }
        ByteBuffer view = ByteBuffer.wrap(payload).order(ByteOrder.BIG_ENDIAN);
        int action = view.get(1) & 0xff;
        int x = view.getInt(10);
        int y = view.getInt(14);
        int msgW = view.getShort(18) & 0xffff;
        int msgH = view.getShort(20) & 0xffff;
        int srcW = msgW > 0 ? msgW : fromW;
        int srcH = msgH > 0 ? msgH : fromH;
        if (srcW <= 0 || srcH <= 0) {
            return payload;
        }
        float mappedX = (float) x / srcW * toW;
        float mappedY = (float) y / srcH * toH;
        return ScrcpyControlWire.injectTouch(action, mappedX, mappedY, toW, toH);
    }

    private void stopDevice(String serial, boolean releaseBackend) {
        GroupSlotCastSession session = sessions.remove(serial);
        if (session != null) {
            session.release();
        }
    }

    private static GroupDevice.CastState mapState(String state) {
        if (GroupSlotCastSession.STATE_STARTING.equals(state)) {
            return GroupDevice.CastState.STARTING;
        }
        if (GroupSlotCastSession.STATE_STREAMING.equals(state)) {
            return GroupDevice.CastState.STREAMING;
        }
        if (GroupSlotCastSession.STATE_ERROR.equals(state)) {
            return GroupDevice.CastState.ERROR;
        }
        return GroupDevice.CastState.IDLE;
    }
}
