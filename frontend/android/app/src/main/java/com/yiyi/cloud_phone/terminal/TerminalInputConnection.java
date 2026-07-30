package com.yiyi.cloud_phone.terminal;

import android.view.KeyEvent;
import android.view.View;
import android.view.inputmethod.BaseInputConnection;
import android.view.inputmethod.EditorInfo;

import java.nio.charset.StandardCharsets;

final class TerminalInputConnection extends BaseInputConnection {
    private final AnsiTerminalView.InputListener listener;

    TerminalInputConnection(View target, AnsiTerminalView.InputListener listener) {
        super(target, true);
        this.listener = listener;
    }

    static void applyEditorInfo(EditorInfo outAttrs) {
        outAttrs.inputType = android.text.InputType.TYPE_NULL;
        outAttrs.imeOptions = EditorInfo.IME_FLAG_NO_FULLSCREEN | EditorInfo.IME_FLAG_NO_EXTRACT_UI;
    }

    @Override
    public boolean commitText(CharSequence text, int newCursorPosition) {
        sendText(text);
        return true;
    }

    @Override
    public boolean finishComposingText() {
        return true;
    }

    @Override
    public boolean deleteSurroundingText(int beforeLength, int afterLength) {
        if (beforeLength > 0 && listener != null) {
            for (int i = 0; i < beforeLength; i++) {
                listener.onInput(new byte[]{127});
            }
        }
        return true;
    }

    @Override
    public boolean sendKeyEvent(KeyEvent event) {
        if (event.getAction() != KeyEvent.ACTION_DOWN || listener == null) {
            return true;
        }
        byte[] data = mapKey(event);
        if (data != null) {
            listener.onInput(data);
        }
        return true;
    }

    private byte[] mapKey(KeyEvent event) {
        switch (event.getKeyCode()) {
            case KeyEvent.KEYCODE_ENTER:
                return new byte[]{'\r'};
            case KeyEvent.KEYCODE_DEL:
                return new byte[]{127};
            case KeyEvent.KEYCODE_TAB:
                return new byte[]{'\t'};
            case KeyEvent.KEYCODE_ESCAPE:
                return new byte[]{0x1B};
            case KeyEvent.KEYCODE_DPAD_UP:
                return new byte[]{0x1B, '[', 'A'};
            case KeyEvent.KEYCODE_DPAD_DOWN:
                return new byte[]{0x1B, '[', 'B'};
            case KeyEvent.KEYCODE_DPAD_RIGHT:
                return new byte[]{0x1B, '[', 'C'};
            case KeyEvent.KEYCODE_DPAD_LEFT:
                return new byte[]{0x1B, '[', 'D'};
            default:
                int unicode = event.getUnicodeChar(event.getMetaState());
                if (unicode > 0) {
                    return new String(Character.toChars(unicode)).getBytes(StandardCharsets.UTF_8);
                }
                return null;
        }
    }

    private void sendText(CharSequence text) {
        if (text == null || text.length() == 0 || listener == null) {
            return;
        }
        listener.onInput(text.toString().getBytes(StandardCharsets.UTF_8));
    }
}
