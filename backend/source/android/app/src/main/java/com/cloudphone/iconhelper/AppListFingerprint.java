package com.cloudphone.iconhelper;

import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** Stable fingerprint for launcher app metadata (package + activity + label). */
public final class AppListFingerprint {

  private AppListFingerprint() {
  }

  public static String compute(List<String> rows) {
    List<String> sorted = new ArrayList<>(rows);
    Collections.sort(sorted);
    String joined = String.join("\n", sorted);
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(joined.getBytes(StandardCharsets.UTF_8));
      StringBuilder hex = new StringBuilder(hash.length * 2);
      for (byte b : hash) {
        hex.append(String.format("%02x", b));
      }
      return hex.toString();
    } catch (Exception error) {
      return Integer.toHexString(joined.hashCode());
    }
  }

  public static String readFingerprint(File root) {
    File file = new File(root, "manifest.json");
    if (!file.isFile()) {
      return "";
    }
    try {
      byte[] bytes = readAll(file);
      JSONObject json = new JSONObject(new String(bytes, StandardCharsets.UTF_8));
      return json.optString("fingerprint", "");
    } catch (Exception ignored) {
      return "";
    }
  }

  public static void writeManifest(File root, String fingerprint, int count) throws Exception {
    JSONObject json = new JSONObject();
    json.put("fingerprint", fingerprint == null ? "" : fingerprint);
    json.put("count", count);
    json.put("updatedAt", System.currentTimeMillis());
    writeText(new File(root, "manifest.json"), json.toString());
  }

  private static byte[] readAll(File file) throws Exception {
    try (FileInputStream in = new FileInputStream(file)) {
      byte[] bytes = new byte[(int) file.length()];
      int offset = 0;
      while (offset < bytes.length) {
        int read = in.read(bytes, offset, bytes.length - offset);
        if (read < 0) {
          break;
        }
        offset += read;
      }
      return bytes;
    }
  }

  private static void writeText(File file, String text) throws Exception {
    File parent = file.getParentFile();
    if (parent != null) {
      //noinspection ResultOfMethodCallIgnored
      parent.mkdirs();
    }
    try (FileOutputStream fos = new FileOutputStream(file)) {
      fos.write(text.getBytes(StandardCharsets.UTF_8));
    }
  }
}
