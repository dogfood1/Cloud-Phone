package com.cloudphone.iconhelper;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.util.Base64;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** Writes UTF-8 text supplied by an authenticated ADB shell command to the device clipboard. */
public final class ClipboardReceiver extends BroadcastReceiver {
  public static final String ACTION_SET_CLIPBOARD =
      "com.cloudphone.iconhelper.SET_CLIPBOARD";
  public static final String EXTRA_TEXT_BASE64 = "text_base64";
  public static final String EXTRA_CLEAR = "clear";

  private static final int MAX_TEXT_BYTES = 128 * 1024;

  @Override
  public void onReceive(Context context, Intent intent) {
    try {
      if (intent == null || !ACTION_SET_CLIPBOARD.equals(intent.getAction())) {
        fail("unsupported_action");
        return;
      }

      byte[] bytes;
      if (intent.getBooleanExtra(EXTRA_CLEAR, false)) {
        bytes = new byte[0];
      } else {
        String encoded = intent.getStringExtra(EXTRA_TEXT_BASE64);
        if (encoded == null) {
          fail("missing_text");
          return;
        }
        bytes = Base64.decode(encoded, Base64.DEFAULT);
      }
      if (bytes.length > MAX_TEXT_BYTES) {
        fail("text_too_large");
        return;
      }

      ClipboardManager clipboard =
          (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
      if (clipboard == null) {
        fail("clipboard_unavailable");
        return;
      }

      String text = new String(bytes, StandardCharsets.UTF_8);
      clipboard.setPrimaryClip(ClipData.newPlainText("Cloud Phone", text));
      setResultCode(Activity.RESULT_OK);
      setResultData("clipboard:" + bytes.length + ":" + sha256(bytes));
    } catch (IllegalArgumentException error) {
      fail("invalid_base64");
    } catch (Exception error) {
      fail("clipboard_write_failed");
    }
  }

  private void fail(String code) {
    setResultCode(Activity.RESULT_CANCELED);
    setResultData("error:" + code);
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
