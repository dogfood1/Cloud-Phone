package com.cloudphone.iconhelper;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

/**
 * Re-run icon extract when launcher packages are added/removed/changed.
 */
public final class PackageChangeReceiver extends BroadcastReceiver {
  private static final String TAG = "IconHelperPkg";

  @Override
  public void onReceive(Context context, Intent intent) {
    if (intent == null || intent.getAction() == null) {
      return;
    }

    String action = intent.getAction();
    if (!Intent.ACTION_PACKAGE_ADDED.equals(action)
        && !Intent.ACTION_PACKAGE_REMOVED.equals(action)
        && !Intent.ACTION_PACKAGE_CHANGED.equals(action)
        && !Intent.ACTION_PACKAGE_REPLACED.equals(action)) {
      return;
    }

    // Ignore our own package churn.
    if (intent.getData() != null) {
      String pkg = intent.getData().getSchemeSpecificPart();
      if (context.getPackageName().equals(pkg)) {
        return;
      }
    }

    Log.i(TAG, "package change: " + action + " → extract");
    Intent service = new Intent(context, IconExtractService.class);
    service.setAction(IconExtractService.ACTION_EXTRACT);
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(service);
      } else {
        context.startService(service);
      }
    } catch (Exception error) {
      Log.w(TAG, "failed to start extract: " + error.getMessage());
    }
  }
}
