package com.genymobile.scrcpy.video;

import com.genymobile.scrcpy.AndroidVersions;
import com.genymobile.scrcpy.util.Ln;
import com.genymobile.scrcpy.wrappers.ServiceManager;

import android.hardware.display.VirtualDisplay;
import android.os.Build;
import android.view.Surface;

/**
 * Create a virtual display, retrying without TRUSTED / OWN_DISPLAY_GROUP flags when
 * the shell identity lacks ADD_TRUSTED_DISPLAY (common on some Android 15 OEM builds).
 */
public final class VirtualDisplayCreator {

  private static final int VIRTUAL_DISPLAY_FLAG_PUBLIC =
      android.hardware.display.DisplayManager.VIRTUAL_DISPLAY_FLAG_PUBLIC;
  private static final int VIRTUAL_DISPLAY_FLAG_PRESENTATION =
      android.hardware.display.DisplayManager.VIRTUAL_DISPLAY_FLAG_PRESENTATION;
  private static final int VIRTUAL_DISPLAY_FLAG_OWN_CONTENT_ONLY =
      android.hardware.display.DisplayManager.VIRTUAL_DISPLAY_FLAG_OWN_CONTENT_ONLY;
  private static final int VIRTUAL_DISPLAY_FLAG_SUPPORTS_TOUCH = 1 << 6;
  private static final int VIRTUAL_DISPLAY_FLAG_ROTATES_WITH_CONTENT = 1 << 7;
  private static final int VIRTUAL_DISPLAY_FLAG_DESTROY_CONTENT_ON_REMOVAL = 1 << 8;
  private static final int VIRTUAL_DISPLAY_FLAG_SHOULD_SHOW_SYSTEM_DECORATIONS = 1 << 9;
  private static final int VIRTUAL_DISPLAY_FLAG_TRUSTED = 1 << 10;
  private static final int VIRTUAL_DISPLAY_FLAG_OWN_DISPLAY_GROUP = 1 << 11;
  private static final int VIRTUAL_DISPLAY_FLAG_ALWAYS_UNLOCKED = 1 << 12;
  private static final int VIRTUAL_DISPLAY_FLAG_TOUCH_FEEDBACK_DISABLED = 1 << 13;
  private static final int VIRTUAL_DISPLAY_FLAG_OWN_FOCUS = 1 << 14;
  private static final int VIRTUAL_DISPLAY_FLAG_DEVICE_DISPLAY_GROUP = 1 << 15;

  private VirtualDisplayCreator() {
  }

  public static VirtualDisplay create(
      String name,
      int width,
      int height,
      int dpi,
      Surface surface,
      boolean vdDestroyContent,
      boolean vdSystemDecorations) throws Exception {
    int base = VIRTUAL_DISPLAY_FLAG_PUBLIC
        | VIRTUAL_DISPLAY_FLAG_PRESENTATION
        | VIRTUAL_DISPLAY_FLAG_OWN_CONTENT_ONLY
        | VIRTUAL_DISPLAY_FLAG_SUPPORTS_TOUCH
        | VIRTUAL_DISPLAY_FLAG_ROTATES_WITH_CONTENT;
    if (vdDestroyContent) {
      base |= VIRTUAL_DISPLAY_FLAG_DESTROY_CONTENT_ON_REMOVAL;
    }
    if (vdSystemDecorations) {
      base |= VIRTUAL_DISPLAY_FLAG_SHOULD_SHOW_SYSTEM_DECORATIONS;
    }

    int[] attempts = buildFlagAttempts(base);
    Exception last = null;
    for (int i = 0; i < attempts.length; i += 1) {
      int flags = attempts[i];
      try {
        VirtualDisplay vd = ServiceManager.getDisplayManager()
            .createNewVirtualDisplay(name, width, height, dpi, surface, flags);
        if (i > 0) {
          Ln.w("Virtual display created with fallback flags=0x" + Integer.toHexString(flags));
        }
        return vd;
      } catch (Exception e) {
        last = e;
        if (!isTrustedDisplayPermissionError(e) || i == attempts.length - 1) {
          break;
        }
        Ln.w("Virtual display flags=0x" + Integer.toHexString(flags)
            + " denied (" + summarize(e) + "); retrying with fewer flags");
      }
    }
    throw last != null ? last : new Exception("Could not create virtual display");
  }

  private static int[] buildFlagAttempts(int base) {
    if (Build.VERSION.SDK_INT < AndroidVersions.API_33_ANDROID_13) {
      return new int[] { base };
    }

    int trusted = base
        | VIRTUAL_DISPLAY_FLAG_TRUSTED
        | VIRTUAL_DISPLAY_FLAG_OWN_DISPLAY_GROUP
        | VIRTUAL_DISPLAY_FLAG_ALWAYS_UNLOCKED
        | VIRTUAL_DISPLAY_FLAG_TOUCH_FEEDBACK_DISABLED;
    if (Build.VERSION.SDK_INT >= AndroidVersions.API_34_ANDROID_14) {
      trusted |= VIRTUAL_DISPLAY_FLAG_OWN_FOCUS | VIRTUAL_DISPLAY_FLAG_DEVICE_DISPLAY_GROUP;
    }

    // 1) full trusted (preferred)  2) unlocked/touch only  3) base public/presentation
    return new int[] {
        trusted,
        base | VIRTUAL_DISPLAY_FLAG_ALWAYS_UNLOCKED | VIRTUAL_DISPLAY_FLAG_TOUCH_FEEDBACK_DISABLED,
        base,
    };
  }

  public static boolean isTrustedDisplayPermissionError(Throwable error) {
    Throwable cur = error;
    while (cur != null) {
      String message = cur.getMessage();
      if (message != null) {
        String lower = message.toLowerCase();
        if (lower.contains("add_trusted_display")
            || lower.contains("trusted virtual display")
            || lower.contains("own_display_group")
            || lower.contains("not in the default displaygroup")) {
          return true;
        }
      }
      cur = cur.getCause();
    }
    return false;
  }

  public static String summarize(Throwable error) {
    Throwable cur = error;
    while (cur.getCause() != null && cur.getCause() != cur) {
      if (cur.getMessage() != null && !cur.getMessage().isEmpty()) {
        break;
      }
      cur = cur.getCause();
    }
    String message = cur.getMessage();
    return message != null && !message.isEmpty() ? message : cur.getClass().getSimpleName();
  }
}
