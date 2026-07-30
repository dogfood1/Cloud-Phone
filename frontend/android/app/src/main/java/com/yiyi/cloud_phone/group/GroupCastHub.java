package com.yiyi.cloud_phone.group;

import android.content.Context;
import android.view.TextureView;

import com.yiyi.cloud_phone.cast.GroupSlotCastSession;

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

    GroupCastHub(Context context) {
        this.context = context.getApplicationContext();
    }

    void setListener(Listener listener) {
        this.listener = listener;
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
        if (session != null) {
            session.bindTexture(texture);
        }
    }

    void unbind(GroupDevice device, TextureView texture) {
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
        }
        session.start();
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
