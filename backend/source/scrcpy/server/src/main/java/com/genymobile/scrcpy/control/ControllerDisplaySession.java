package com.genymobile.scrcpy.control;

import com.genymobile.scrcpy.device.Device;
import com.genymobile.scrcpy.model.DeviceApp;
import com.genymobile.scrcpy.util.Ln;
import com.genymobile.scrcpy.util.LogUtils;

import android.view.KeyEvent;

import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

final class ControllerDisplaySession {

    private ControllerDisplaySession() {
    }

    static void scheduleDisplayPowerOff(int displayId) {
        Controller.EXECUTOR.schedule(() -> {
            Ln.i("Forcing display off");
            Device.setDisplayPower(displayId, false);
        }, 200, TimeUnit.MILLISECONDS);
    }

    static void startAppAsync(Controller controller, String name) {
        if (controller.startAppExecutor == null) {
            controller.startAppExecutor = Executors.newSingleThreadExecutor();
        }

        controller.startAppExecutor.submit(() -> startApp(controller, name));
    }

    static void startApp(Controller controller, String name) {
        boolean forceStopBeforeStart = name.startsWith("+");
        if (forceStopBeforeStart) {
            name = name.substring(1);
        }

        DeviceApp app;
        boolean searchByName = name.startsWith("?");
        if (searchByName) {
            name = name.substring(1);

            Ln.i("Processing Android apps... (this may take some time)");
            List<DeviceApp> apps = Device.findByName(name);
            if (apps.isEmpty()) {
                Ln.w("No app found for name \"" + name + "\"");
                return;
            }

            if (apps.size() > 1) {
                String title = "No unique app found for name \"" + name + "\":";
                Ln.w(LogUtils.buildAppListMessage(title, apps));
                return;
            }

            app = apps.get(0);
        } else {
            app = Device.findByPackageName(name);
            if (app == null) {
                Ln.w("No app found for package \"" + name + "\"");
                return;
            }
        }

        int startAppDisplayId = getStartAppDisplayId(controller);
        if (startAppDisplayId == Device.DISPLAY_ID_NONE) {
            Ln.e("No known display id to start app \"" + name + "\"");
            return;
        }

        Ln.i("Starting app \"" + app.getName() + "\" [" + app.getPackageName() + "] on display " + startAppDisplayId + "...");
        Device.startApp(app.getPackageName(), startAppDisplayId, forceStopBeforeStart);
    }

    static int getStartAppDisplayId(Controller controller) {
        if (controller.displayId != Device.DISPLAY_ID_NONE) {
            return controller.displayId;
        }

        try {
            long timeoutMs = 5000;
            Controller.DisplayData data = waitDisplayData(controller, timeoutMs);
            if (data != null) {
                return data.virtualDisplayId;
            }
        } catch (InterruptedException e) {
            // do nothing
        }

        return Device.DISPLAY_ID_NONE;
    }

    static Controller.DisplayData waitDisplayData(Controller controller, long timeoutMillis) throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMillis;

        synchronized (controller.displayDataAvailable) {
            Controller.DisplayData data = controller.displayData.get();
            while (data == null) {
                long timeout = deadline - System.currentTimeMillis();
                if (timeout < 0) {
                    return null;
                }
                if (timeout > 0) {
                    controller.displayDataAvailable.wait(timeout);
                }
                data = controller.displayData.get();
            }

            return data;
        }
    }

    static void setDisplayPower(Controller controller, boolean on) {
        int targetDisplayId = controller.displayId != Device.DISPLAY_ID_NONE ? controller.displayId : 0;

        if (!on) {
            controller.clientRequestedDisplayOff = true;
            if (setDisplayPowerInternal(controller, targetDisplayId, false)) {
                controller.keepDisplayPowerOff = controller.displayId != Device.DISPLAY_ID_NONE;
            }
            return;
        }

        controller.keepDisplayPowerOff = false;
        boolean wasClientOff = controller.clientRequestedDisplayOff;
        controller.clientRequestedDisplayOff = false;

        boolean setDisplayPowerOk = setDisplayPowerInternal(controller, targetDisplayId, true);
        if (!setDisplayPowerOk && controller.supportsInputEvents) {
            Ln.i("setDisplayPower failed, trying POWER key wake");
            controller.pressReleaseKeycode(KeyEvent.KEYCODE_POWER, Device.INJECT_MODE_ASYNC);
        }

        completeDisplayWake(controller, targetDisplayId, wasClientOff);
    }

    static boolean setDisplayPowerInternal(Controller controller, int targetDisplayId, boolean on) {
        boolean setDisplayPowerOk = Device.setDisplayPower(targetDisplayId, on);
        if (setDisplayPowerOk) {
            controller.keepDisplayPowerOff = controller.displayId != Device.DISPLAY_ID_NONE && !on;
            Ln.i("Device display turned " + (on ? "on" : "off"));
            if (controller.cleanUp != null) {
                controller.cleanUp.setRestoreDisplayPower(!on);
            }
        }
        return setDisplayPowerOk;
    }

    static void completeDisplayWake(Controller controller, int targetDisplayId, boolean afterClientTurnedOff) {
        Device.keepActive(targetDisplayId);
        controller.resetVideo();

        Controller.EXECUTOR.schedule(() -> {
            controller.resetVideo();

            if (!controller.supportsInputEvents) {
                return;
            }

            if (!Device.isScreenOn(targetDisplayId)) {
                Ln.i("Display still off after wake, trying POWER key");
                controller.pressReleaseKeycode(KeyEvent.KEYCODE_POWER, Device.INJECT_MODE_ASYNC);
                Controller.EXECUTOR.schedule(controller::resetVideo, 500, TimeUnit.MILLISECONDS);
                return;
            }

            if (afterClientTurnedOff) {
                Ln.i("Refreshing System UI after client display wake");
                controller.pressReleaseKeycode(KeyEvent.KEYCODE_WAKEUP, Device.INJECT_MODE_ASYNC);
                controller.pressReleaseKeycode(KeyEvent.KEYCODE_HOME, Device.INJECT_MODE_ASYNC);
                Controller.EXECUTOR.schedule(controller::resetVideo, 500, TimeUnit.MILLISECONDS);
            }
        }, 250, TimeUnit.MILLISECONDS);
    }
}
