package com.yiyi.cloud_phone.group;

import android.view.MotionEvent;
import android.view.TextureView;
import android.view.View;
import android.view.ViewParent;

import com.yiyi.cloud_phone.cast.GroupSlotCastSession;
import com.yiyi.cloud_phone.cast.ScrcpyControlWire;

/** Maps preview touches to device control; blank grid areas keep RecyclerView scrolling. */
final class GroupSlotTouchBinder {
    interface InteractionGate {
        boolean canControl(String serial);
    }

    private GroupSlotTouchBinder() {
    }

    static void attach(TextureView texture, String serial, GroupSlotCastSession session, InteractionGate gate) {
        if (texture == null || session == null) {
            return;
        }
        texture.setClickable(true);
        texture.setOnTouchListener((v, event) -> handle(v, event, serial, session, gate));
    }

    static void detach(TextureView texture) {
        if (texture != null) {
            texture.setOnTouchListener(null);
            texture.setClickable(false);
        }
    }

    private static boolean handle(
            View view,
            MotionEvent event,
            String serial,
            GroupSlotCastSession session,
            InteractionGate gate
    ) {
        if (gate == null || !gate.canControl(serial) || !session.isStreaming()) {
            return false;
        }
        int motion;
        int masked = event.getActionMasked();
        if (masked == MotionEvent.ACTION_DOWN) {
            motion = ScrcpyControlWire.MOTION_DOWN;
            disallowParentIntercept(view, true);
        } else if (masked == MotionEvent.ACTION_MOVE) {
            motion = ScrcpyControlWire.MOTION_MOVE;
        } else if (masked == MotionEvent.ACTION_UP || masked == MotionEvent.ACTION_CANCEL) {
            motion = ScrcpyControlWire.MOTION_UP;
            disallowParentIntercept(view, false);
        } else {
            return false;
        }
        session.sendTouch(motion, event.getX(), event.getY(), view.getWidth(), view.getHeight());
        return true;
    }

    private static void disallowParentIntercept(View view, boolean disallow) {
        ViewParent parent = view.getParent();
        while (parent != null) {
            parent.requestDisallowInterceptTouchEvent(disallow);
            parent = parent.getParent();
        }
    }
}
