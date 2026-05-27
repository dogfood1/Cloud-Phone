package com.genymobile.scrcpy;

import com.genymobile.scrcpy.model.NewDisplay;
import com.genymobile.scrcpy.model.Orientation;
import com.genymobile.scrcpy.model.Size;
import com.genymobile.scrcpy.video.CameraAspectRatio;
import com.genymobile.scrcpy.wrappers.WindowManager;

import android.graphics.Rect;
import android.util.Pair;

final class OptionsValueParsers {

    private OptionsValueParsers() {
    }

    static Rect parseCrop(String crop) {
        // input format: "width:height:x:y"
        String[] tokens = crop.split(":");
        if (tokens.length != 4) {
            throw new IllegalArgumentException("Crop must contains 4 values separated by colons: \"" + crop + "\"");
        }
        int width = Integer.parseInt(tokens[0]);
        int height = Integer.parseInt(tokens[1]);
        if (width <= 0 || height <= 0) {
            throw new IllegalArgumentException("Invalid crop size: " + width + "x" + height);
        }
        int x = Integer.parseInt(tokens[2]);
        int y = Integer.parseInt(tokens[3]);
        if (x < 0 || y < 0) {
            throw new IllegalArgumentException("Invalid crop offset: " + x + ":" + y);
        }
        return new Rect(x, y, x + width, y + height);
    }

    static Size parseSize(String size) {
        // input format: "<width>x<height>"
        String[] tokens = size.split("x");
        if (tokens.length != 2) {
            throw new IllegalArgumentException("Invalid size format (expected <width>x<height>): \"" + size + "\"");
        }
        int width = Integer.parseInt(tokens[0]);
        int height = Integer.parseInt(tokens[1]);
        if (width <= 0 || height <= 0) {
            throw new IllegalArgumentException("Invalid non-positive size dimension: \"" + size + "\"");
        }
        return new Size(width, height);
    }

    static CameraAspectRatio parseCameraAspectRatio(String ar) {
        if ("sensor".equals(ar)) {
            return CameraAspectRatio.sensorAspectRatio();
        }

        String[] tokens = ar.split(":");
        if (tokens.length == 2) {
            int w = Integer.parseInt(tokens[0]);
            int h = Integer.parseInt(tokens[1]);
            return CameraAspectRatio.fromFraction(w, h);
        }

        float floatAr = Float.parseFloat(tokens[0]);
        return CameraAspectRatio.fromFloat(floatAr);
    }

    static float parseFloat(String key, String value) {
        try {
            return Float.parseFloat(value);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid float value for " + key + ": \"" + value + "\"");
        }
    }

    static NewDisplay parseNewDisplay(String newDisplay) {
        // Possible inputs:
        //  - "" (empty string)
        //  - "<width>x<height>/<dpi>"
        //  - "<width>x<height>"
        //  - "/<dpi>"
        if (newDisplay.isEmpty()) {
            return new NewDisplay();
        }

        String[] tokens = newDisplay.split("/");

        Size size;
        if (!tokens[0].isEmpty()) {
            size = parseSize(tokens[0]);
        } else {
            size = null;
        }

        int dpi;
        if (tokens.length >= 2) {
            dpi = Integer.parseInt(tokens[1]);
            if (dpi <= 0) {
                throw new IllegalArgumentException("Invalid non-positive dpi: " + tokens[1]);
            }
        } else {
            dpi = 0;
        }

        return new NewDisplay(size, dpi);
    }

    static Pair<Orientation.Lock, Orientation> parseCaptureOrientation(String value) {
        if (value.isEmpty()) {
            throw new IllegalArgumentException("Empty capture orientation string");
        }

        Orientation.Lock lock;
        if (value.charAt(0) == '@') {
            // Consume '@'
            value = value.substring(1);
            if (value.isEmpty()) {
                // Only '@': lock to the initial orientation (orientation is unused)
                return Pair.create(Orientation.Lock.LockedInitial, Orientation.Orient0);
            }
            lock = Orientation.Lock.LockedValue;
        } else {
            lock = Orientation.Lock.Unlocked;
        }

        return Pair.create(lock, Orientation.getByName(value));
    }

    static int parseDisplayImePolicy(String value) {
        switch (value) {
            case "local":
                return WindowManager.DISPLAY_IME_POLICY_LOCAL;
            case "fallback":
                return WindowManager.DISPLAY_IME_POLICY_FALLBACK_DISPLAY;
            case "hide":
                return WindowManager.DISPLAY_IME_POLICY_HIDE;
            default:
                throw new IllegalArgumentException("Invalid display IME policy: " + value);
        }
    }
}
