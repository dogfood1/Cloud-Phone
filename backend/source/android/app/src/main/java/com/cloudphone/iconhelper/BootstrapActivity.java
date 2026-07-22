package com.cloudphone.iconhelper;

import android.app.Activity;
import android.os.Bundle;

/** Invisible activity so the package can be launched once to create Android/data dirs. */
public final class BootstrapActivity extends Activity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    finish();
  }
}
