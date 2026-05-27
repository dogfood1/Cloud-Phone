package com.genymobile.scrcpy.control;

import com.genymobile.scrcpy.AndroidVersions;
import com.genymobile.scrcpy.device.Device;
import com.genymobile.scrcpy.util.Ln;

import android.os.Build;
import android.view.KeyEvent;

final class ControllerKeyboardInput {

    private ControllerKeyboardInput() {
    }

    static boolean injectKeycode(Controller controller, int action, int keycode, int repeat, int metaState) {
        if (controller.keepDisplayPowerOff && action == KeyEvent.ACTION_UP
                && (keycode == KeyEvent.KEYCODE_POWER || keycode == KeyEvent.KEYCODE_WAKEUP)) {
            assert controller.displayId != Device.DISPLAY_ID_NONE;
            ControllerDisplaySession.scheduleDisplayPowerOff(controller.displayId);
        }
        return injectKeyEvent(controller, action, keycode, repeat, metaState, Device.INJECT_MODE_ASYNC);
    }

    static boolean injectChar(Controller controller, char c) {
        String decomposed = KeyComposition.decompose(c);
        char[] chars = decomposed != null ? decomposed.toCharArray() : new char[]{c};
        KeyEvent[] events = controller.charMap.getEvents(chars);
        if (events == null) {
            return false;
        }

        int actionDisplayId = getActionDisplayId(controller);
        if (actionDisplayId != Device.DISPLAY_ID_NONE) {
            for (KeyEvent event : events) {
                if (!Device.injectEvent(event, actionDisplayId, Device.INJECT_MODE_ASYNC)) {
                    return false;
                }
            }
        }
        return true;
    }

    static int injectText(Controller controller, String text) {
        int successCount = 0;
        for (char c : text.toCharArray()) {
            if (!injectChar(controller, c)) {
                Ln.w("Could not inject char u+" + String.format("%04x", (int) c));
                continue;
            }
            successCount++;
        }
        return successCount;
    }

    static boolean pressBackOrTurnScreenOn(Controller controller, int action) {
        boolean injectBack;
        if (Build.VERSION.SDK_INT >= AndroidVersions.API_34_ANDROID_14) {
            int actionDisplayId = getActionDisplayId(controller);
            injectBack = actionDisplayId == Device.DISPLAY_ID_NONE || Device.isScreenOn(actionDisplayId);
        } else {
            injectBack = controller.displayId != 0 || Device.isScreenOn(0);
        }
        if (injectBack) {
            return injectKeyEvent(controller, action, KeyEvent.KEYCODE_BACK, 0, 0, Device.INJECT_MODE_ASYNC);
        }

        if (action != KeyEvent.ACTION_DOWN) {
            return true;
        }

        if (controller.keepDisplayPowerOff) {
            assert controller.displayId != Device.DISPLAY_ID_NONE;
            ControllerDisplaySession.scheduleDisplayPowerOff(controller.displayId);
        }
        return controller.pressReleaseKeycode(KeyEvent.KEYCODE_POWER, Device.INJECT_MODE_ASYNC);
    }

    static boolean injectKeyEvent(Controller controller, int action, int keyCode, int repeat, int metaState, int injectMode) {
        int actionDisplayId = getActionDisplayId(controller);
        if (actionDisplayId == Device.DISPLAY_ID_NONE) {
            return false;
        }
        return Device.injectKeyEvent(action, keyCode, repeat, metaState, actionDisplayId, injectMode);
    }

    static int getActionDisplayId(Controller controller) {
        if (controller.displayId != Device.DISPLAY_ID_NONE) {
            return controller.displayId;
        }

        Controller.DisplayData data = controller.displayData.get();
        if (data == null) {
            return Device.DISPLAY_ID_NONE;
        }

        return data.virtualDisplayId;
    }
}
