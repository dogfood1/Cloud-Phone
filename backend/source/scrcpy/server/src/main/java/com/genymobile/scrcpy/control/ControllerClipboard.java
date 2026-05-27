package com.genymobile.scrcpy.control;

import com.genymobile.scrcpy.AndroidVersions;
import com.genymobile.scrcpy.device.Device;
import com.genymobile.scrcpy.util.Ln;

import android.content.Intent;
import android.os.Build;
import android.view.KeyEvent;

import com.genymobile.scrcpy.wrappers.ServiceManager;

final class ControllerClipboard {

    private ControllerClipboard() {
    }

    static void getClipboard(Controller controller, int copyKey) {
        if (copyKey != ControlMessage.COPY_KEY_NONE
                && Build.VERSION.SDK_INT >= AndroidVersions.API_24_ANDROID_7_0
                && controller.supportsInputEvents) {
            int key = copyKey == ControlMessage.COPY_KEY_COPY ? KeyEvent.KEYCODE_COPY : KeyEvent.KEYCODE_CUT;
            controller.pressReleaseKeycode(key, Device.INJECT_MODE_WAIT_FOR_FINISH);
        }

        if (!controller.clipboardAutosync) {
            String clipboardText = Device.getClipboardText();
            if (clipboardText != null) {
                DeviceMessage msg = DeviceMessage.createClipboard(clipboardText);
                controller.sender.send(msg);
            }
        }
    }

    static boolean setClipboard(Controller controller, String text, boolean paste, long sequence) {
        controller.isSettingClipboard.set(true);
        boolean ok = Device.setClipboardText(text);
        controller.isSettingClipboard.set(false);
        if (ok) {
            Ln.i("Device clipboard set");
        }

        if (paste && Build.VERSION.SDK_INT >= AndroidVersions.API_24_ANDROID_7_0 && controller.supportsInputEvents) {
            controller.pressReleaseKeycode(KeyEvent.KEYCODE_PASTE, Device.INJECT_MODE_ASYNC);
        }

        if (sequence != ControlMessage.SEQUENCE_INVALID) {
            DeviceMessage msg = DeviceMessage.createAckClipboard(sequence);
            controller.sender.send(msg);
        }

        return ok;
    }

    static void openHardKeyboardSettings() {
        Intent intent = new Intent("android.settings.HARD_KEYBOARD_SETTINGS");
        ServiceManager.getActivityManager().startActivity(intent);
    }
}
