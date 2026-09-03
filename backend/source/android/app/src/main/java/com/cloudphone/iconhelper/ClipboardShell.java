package com.cloudphone.iconhelper;

import android.content.ClipData;
import android.net.Uri;
import android.os.IBinder;
import android.util.Base64;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** Reads clipboard text while running under the ADB shell identity via app_process. */
public final class ClipboardShell {
  private static final int MAX_TEXT_BYTES = 128 * 1024;

  private ClipboardShell() {}

  public static void main(String[] args) {
    try {
      String text = readClipboardText();
      byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
      if (bytes.length > MAX_TEXT_BYTES) {
        throw new IllegalStateException("clipboard_text_too_large");
      }

      String encoded = Base64.encodeToString(bytes, Base64.NO_WRAP);
      System.out.println("clipboard:" + bytes.length + ":" + sha256(bytes) + ":" + encoded);
    } catch (Throwable error) {
      Throwable cause = error instanceof InvocationTargetException && error.getCause() != null
          ? error.getCause()
          : error;
      System.err.println("clipboard_error:" + cause.getClass().getSimpleName() + ":"
          + String.valueOf(cause.getMessage()));
      System.exit(2);
    }
  }

  private static String readClipboardText() throws Exception {
    Class<?> serviceManager = Class.forName("android.os.ServiceManager");
    Method getService = serviceManager.getDeclaredMethod("getService", String.class);
    IBinder binder = (IBinder) getService.invoke(null, "clipboard");
    if (binder == null) {
      throw new IllegalStateException("clipboard_unavailable");
    }

    Class<?> stub = Class.forName("android.content.IClipboard$Stub");
    Object clipboard = stub.getDeclaredMethod("asInterface", IBinder.class).invoke(null, binder);
    Method getPrimaryClip = clipboard.getClass().getMethod(
        "getPrimaryClip", String.class, String.class, int.class);
    ClipData clip = (ClipData) getPrimaryClip.invoke(clipboard, "com.android.shell", null, 0);
    if (clip == null || clip.getItemCount() == 0) {
      return "";
    }

    ClipData.Item item = clip.getItemAt(0);
    CharSequence text = item.getText();
    if (text != null) {
      return text.toString();
    }

    Uri uri = item.getUri();
    if (uri != null) {
      return uri.toString();
    }

    return item.getIntent() == null ? "" : item.getIntent().toUri(0);
  }

  private static String sha256(byte[] bytes) throws Exception {
    byte[] digest = MessageDigest.getInstance("SHA-256").digest(bytes);
    StringBuilder hex = new StringBuilder(digest.length * 2);
    for (byte value : digest) {
      hex.append(String.format("%02x", value & 0xff));
    }
    return hex.toString();
  }
}
