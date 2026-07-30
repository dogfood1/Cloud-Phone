package com.yiyi.cloud_phone.terminal;

import android.content.Context;
import android.graphics.Typeface;
import android.util.AttributeSet;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.GridLayout;
import android.widget.LinearLayout;

import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;

import com.yiyi.cloud_phone.R;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * Termux-style bottom extra keys (two rows), based on termux default:
 * ESC / - HOME UP END PGUP
 * TAB CTRL ALT LEFT DOWN RIGHT PGDN
 */
public final class TerminalExtraKeysBar extends LinearLayout {
    public interface Listener {
        void onBytes(byte[] data);

        void onToggleSoftKeyboard();
    }

    private static final String[][] ROWS = {
            {"ESC", "/", "-", "HOME", "↑", "END", "PGUP", "⌨"},
            {"TAB", "CTRL", "ALT", "←", "↓", "→", "PGDN", "ENT"}
    };

    private Listener listener;
    private boolean ctrlOn;
    private boolean altOn;
    private Button ctrlButton;
    private Button altButton;

    public TerminalExtraKeysBar(Context context) {
        super(context);
        init();
    }

    public TerminalExtraKeysBar(Context context, @Nullable AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    public void setListener(Listener listener) {
        this.listener = listener;
    }

    private void init() {
        setOrientation(VERTICAL);
        setBackgroundColor(0xFF212121);
        int pad = dp(2);
        setPadding(pad, pad, pad, pad);
        for (String[] row : ROWS) {
            addView(buildRow(row), new LayoutParams(LayoutParams.MATCH_PARENT, dp(40)));
        }
    }

    private GridLayout buildRow(String[] keys) {
        GridLayout grid = new GridLayout(getContext());
        grid.setColumnCount(keys.length);
        grid.setUseDefaultMargins(false);
        for (int i = 0; i < keys.length; i++) {
            String key = keys[i];
            Button button = new Button(getContext(), null, android.R.attr.borderlessButtonStyle);
            button.setText(key);
            button.setAllCaps(false);
            button.setTypeface(Typeface.MONOSPACE);
            button.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f);
            button.setTextColor(0xFFE0E0E0);
            button.setMinHeight(0);
            button.setMinWidth(0);
            button.setPadding(0, 0, 0, 0);
            button.setGravity(Gravity.CENTER);
            button.setBackgroundResource(R.drawable.bg_terminal_extra_key);
            button.setOnClickListener(v -> onKey(key, button));
            if ("CTRL".equals(key)) {
                ctrlButton = button;
            } else if ("ALT".equals(key)) {
                altButton = button;
            }
            GridLayout.LayoutParams lp = new GridLayout.LayoutParams();
            lp.width = 0;
            lp.height = LayoutParams.MATCH_PARENT;
            lp.columnSpec = GridLayout.spec(i, 1f);
            lp.setMargins(dp(1), dp(1), dp(1), dp(1));
            grid.addView(button, lp);
        }
        return grid;
    }

    private void onKey(String key, Button button) {
        if ("CTRL".equals(key)) {
            ctrlOn = !ctrlOn;
            refreshModifier(ctrlButton, ctrlOn);
            return;
        }
        if ("ALT".equals(key)) {
            altOn = !altOn;
            refreshModifier(altButton, altOn);
            return;
        }
        if ("⌨".equals(key)) {
            if (listener != null) {
                listener.onToggleSoftKeyboard();
            }
            return;
        }
        byte[] data = mapKey(key);
        if (data != null && listener != null) {
            listener.onBytes(data);
        }
        if (ctrlOn) {
            ctrlOn = false;
            refreshModifier(ctrlButton, false);
        }
        if (altOn) {
            altOn = false;
            refreshModifier(altButton, false);
        }
    }

    private byte[] mapKey(String key) {
        Map<String, byte[]> fixed = fixedKeys();
        if (fixed.containsKey(key)) {
            byte[] base = fixed.get(key);
            if (altOn && base.length == 1 && Character.isLetter((char) (base[0] & 0xFF))) {
                return new byte[]{0x1B, base[0]};
            }
            if (ctrlOn && base.length == 1) {
                char ch = Character.toUpperCase((char) (base[0] & 0xFF));
                if (ch >= '@' && ch <= '_') {
                    return new byte[]{(byte) (ch - '@')};
                }
            }
            return base;
        }
        if (key.length() == 1) {
            char ch = key.charAt(0);
            if (ctrlOn) {
                char up = Character.toUpperCase(ch);
                if (up >= '@' && up <= '_') {
                    return new byte[]{(byte) (up - '@')};
                }
            }
            if (altOn) {
                return new byte[]{0x1B, (byte) ch};
            }
            return String.valueOf(ch).getBytes(StandardCharsets.UTF_8);
        }
        return null;
    }

    private static Map<String, byte[]> fixedKeys() {
        Map<String, byte[]> map = new HashMap<>();
        map.put("ESC", new byte[]{0x1B});
        map.put("TAB", new byte[]{'\t'});
        map.put("ENT", new byte[]{'\r'});
        map.put("/", new byte[]{'/'});
        map.put("-", new byte[]{'-'});
        map.put("↑", new byte[]{0x1B, '[', 'A'});
        map.put("↓", new byte[]{0x1B, '[', 'B'});
        map.put("→", new byte[]{0x1B, '[', 'C'});
        map.put("←", new byte[]{0x1B, '[', 'D'});
        map.put("HOME", new byte[]{0x1B, '[', 'H'});
        map.put("END", new byte[]{0x1B, '[', 'F'});
        map.put("PGUP", new byte[]{0x1B, '[', '5', '~'});
        map.put("PGDN", new byte[]{0x1B, '[', '6', '~'});
        return map;
    }

    private void refreshModifier(Button button, boolean on) {
        if (button == null) {
            return;
        }
        button.setSelected(on);
        button.setTextColor(on
                ? ContextCompat.getColor(getContext(), R.color.auth_primary)
                : 0xFFE0E0E0);
    }

    private int dp(int value) {
        return Math.round(TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                value,
                getResources().getDisplayMetrics()
        ));
    }
}
