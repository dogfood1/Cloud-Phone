package com.genymobile.scrcpy.control;

import com.genymobile.scrcpy.AndroidVersions;
import com.genymobile.scrcpy.device.Device;
import com.genymobile.scrcpy.model.Point;
import com.genymobile.scrcpy.model.Position;
import com.genymobile.scrcpy.model.Size;
import com.genymobile.scrcpy.util.Ln;
import com.genymobile.scrcpy.wrappers.InputManager;

import android.os.Build;
import android.os.SystemClock;
import android.util.Pair;
import android.view.InputDevice;
import android.view.MotionEvent;

final class ControllerTouchInput {

    private static final int POINTER_ID_MOUSE = -1;
    private static final int DEFAULT_DEVICE_ID = 0;

    private ControllerTouchInput() {
    }

    static Pair<Point, Integer> getEventPointAndDisplayId(Controller controller, Position position) {
        @SuppressWarnings("checkstyle:HiddenField")
        Controller.DisplayData displayData = controller.displayData.get();
        assert displayData != null || controller.displayId != Device.DISPLAY_ID_NONE
                : "Cannot receive a positional event without a display";

        Point point;
        int targetDisplayId;
        if (displayData != null) {
            point = displayData.positionMapper.map(position);
            if (point == null) {
                if (Ln.isEnabled(Ln.Level.VERBOSE)) {
                    Size eventSize = position.getScreenSize();
                    Size currentSize = displayData.positionMapper.getVideoSize();
                    Ln.v("Ignore positional event generated for size " + eventSize + " (current size is " + currentSize + ")");
                }
                return null;
            }
            targetDisplayId = displayData.virtualDisplayId;
        } else {
            point = position.getPoint();
            targetDisplayId = controller.displayId;
        }

        return Pair.create(point, targetDisplayId);
    }

    static boolean injectTouch(Controller controller, int action, long pointerId, Position position, float pressure,
            int actionButton, int buttons) {
        long now = SystemClock.uptimeMillis();

        Pair<Point, Integer> pair = getEventPointAndDisplayId(controller, position);
        if (pair == null) {
            return false;
        }

        Point point = pair.first;
        int targetDisplayId = pair.second;

        int pointerIndex = controller.pointersState.getPointerIndex(pointerId);
        if (pointerIndex == -1) {
            Ln.w("Too many pointers for touch event");
            return false;
        }
        Pointer pointer = controller.pointersState.get(pointerIndex);
        pointer.setPoint(point);
        pointer.setPressure(pressure);

        int source;
        boolean activeSecondaryButtons = ((actionButton | buttons) & ~MotionEvent.BUTTON_PRIMARY) != 0;
        if (pointerId == POINTER_ID_MOUSE && (action == MotionEvent.ACTION_HOVER_MOVE || activeSecondaryButtons)) {
            controller.pointerProperties[pointerIndex].toolType = MotionEvent.TOOL_TYPE_MOUSE;
            source = InputDevice.SOURCE_MOUSE;
            pointer.setUp(buttons == 0);
        } else {
            controller.pointerProperties[pointerIndex].toolType = MotionEvent.TOOL_TYPE_FINGER;
            source = InputDevice.SOURCE_TOUCHSCREEN;
            buttons = 0;
            pointer.setUp(action == MotionEvent.ACTION_UP);
        }

        int pointerCount = controller.pointersState.update(controller.pointerProperties, controller.pointerCoords);
        if (pointerCount == 1) {
            if (action == MotionEvent.ACTION_DOWN) {
                controller.lastTouchDown = now;
            }
        } else {
            if (action == MotionEvent.ACTION_UP) {
                action = MotionEvent.ACTION_POINTER_UP | (pointerIndex << MotionEvent.ACTION_POINTER_INDEX_SHIFT);
            } else if (action == MotionEvent.ACTION_DOWN) {
                action = MotionEvent.ACTION_POINTER_DOWN | (pointerIndex << MotionEvent.ACTION_POINTER_INDEX_SHIFT);
            }
        }

        if (Build.VERSION.SDK_INT >= AndroidVersions.API_23_ANDROID_6_0 && source == InputDevice.SOURCE_MOUSE) {
            if (action == MotionEvent.ACTION_DOWN) {
                if (actionButton == buttons) {
                    MotionEvent downEvent = MotionEvent.obtain(controller.lastTouchDown, now, MotionEvent.ACTION_DOWN,
                            pointerCount, controller.pointerProperties, controller.pointerCoords, 0, buttons, 1f, 1f,
                            DEFAULT_DEVICE_ID, 0, source, 0);
                    if (!Device.injectEvent(downEvent, targetDisplayId, Device.INJECT_MODE_ASYNC)) {
                        return false;
                    }
                }

                MotionEvent pressEvent = MotionEvent.obtain(controller.lastTouchDown, now, MotionEvent.ACTION_BUTTON_PRESS,
                        pointerCount, controller.pointerProperties, controller.pointerCoords, 0, buttons, 1f, 1f,
                        DEFAULT_DEVICE_ID, 0, source, 0);
                if (!InputManager.setActionButton(pressEvent, actionButton)) {
                    return false;
                }
                if (!Device.injectEvent(pressEvent, targetDisplayId, Device.INJECT_MODE_ASYNC)) {
                    return false;
                }

                return true;
            }

            if (action == MotionEvent.ACTION_UP) {
                MotionEvent releaseEvent = MotionEvent.obtain(controller.lastTouchDown, now,
                        MotionEvent.ACTION_BUTTON_RELEASE, pointerCount, controller.pointerProperties,
                        controller.pointerCoords, 0, buttons, 1f, 1f, DEFAULT_DEVICE_ID, 0, source, 0);
                if (!InputManager.setActionButton(releaseEvent, actionButton)) {
                    return false;
                }
                if (!Device.injectEvent(releaseEvent, targetDisplayId, Device.INJECT_MODE_ASYNC)) {
                    return false;
                }

                if (buttons == 0) {
                    MotionEvent upEvent = MotionEvent.obtain(controller.lastTouchDown, now, MotionEvent.ACTION_UP,
                            pointerCount, controller.pointerProperties, controller.pointerCoords, 0, buttons, 1f, 1f,
                            DEFAULT_DEVICE_ID, 0, source, 0);
                    if (!Device.injectEvent(upEvent, targetDisplayId, Device.INJECT_MODE_ASYNC)) {
                        return false;
                    }
                }

                return true;
            }
        }

        MotionEvent event = MotionEvent.obtain(controller.lastTouchDown, now, action, pointerCount,
                controller.pointerProperties, controller.pointerCoords, 0, buttons, 1f, 1f, DEFAULT_DEVICE_ID, 0, source, 0);
        return Device.injectEvent(event, targetDisplayId, Device.INJECT_MODE_ASYNC);
    }

    static boolean injectScroll(Controller controller, Position position, float hScroll, float vScroll, int buttons) {
        long now = SystemClock.uptimeMillis();

        Pair<Point, Integer> pair = getEventPointAndDisplayId(controller, position);
        if (pair == null) {
            return false;
        }

        Point point = pair.first;
        int targetDisplayId = pair.second;

        MotionEvent.PointerProperties props = controller.pointerProperties[0];
        props.id = 0;

        MotionEvent.PointerCoords coords = controller.pointerCoords[0];
        coords.x = point.getX();
        coords.y = point.getY();
        coords.setAxisValue(MotionEvent.AXIS_HSCROLL, hScroll);
        coords.setAxisValue(MotionEvent.AXIS_VSCROLL, vScroll);

        MotionEvent event = MotionEvent.obtain(controller.lastTouchDown, now, MotionEvent.ACTION_SCROLL, 1,
                controller.pointerProperties, controller.pointerCoords, 0, buttons, 1f, 1f, DEFAULT_DEVICE_ID, 0,
                InputDevice.SOURCE_MOUSE, 0);
        return Device.injectEvent(event, targetDisplayId, Device.INJECT_MODE_ASYNC);
    }
}
