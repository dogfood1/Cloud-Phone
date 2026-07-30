package com.yiyi.cloud_phone.terminal;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.Typeface;
import android.util.AttributeSet;
import android.view.KeyEvent;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;
import android.view.inputmethod.InputMethodManager;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Minimal ANSI terminal view. Supports basic ANSI SGR color codes,
 * CR/LF, backspace. Suitable for ADB shell output.
 */
public class AnsiTerminalView extends View {
    interface InputListener {
        void onInput(byte[] data);
    }

    private static final int MAX_LINES = 2000;
    private static final int DEFAULT_COLS = 80;
    private static final int DEFAULT_ROWS = 24;

    private final Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private float charWidth;
    private float charHeight;
    private float charAscent;

    private final List<String> lines = new ArrayList<>();
    private final List<int[]> lineColors = new ArrayList<>(); // fg color per char

    private int currentFg = Color.WHITE;
    private final StringBuilder currentLine = new StringBuilder();
    private final List<Integer> currentLineColors = new ArrayList<>();

    private int scrollOffset = 0;
    private InputListener inputListener;

    private static final int[] ANSI_COLORS = {
            Color.BLACK, 0xFFAA0000, 0xFF00AA00, 0xFFAA5500,
            0xFF0000AA, 0xFFAA00AA, 0xFF00AAAA, 0xFFAAAAAA,
            0xFF555555, 0xFFFF5555, 0xFF55FF55, 0xFFFFFF55,
            0xFF5555FF, 0xFFFF55FF, 0xFF55FFFF, 0xFFFFFFFF
    };

    public AnsiTerminalView(Context context) {
        super(context);
        init();
    }

    public AnsiTerminalView(Context context, AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    private void init() {
        setFocusable(true);
        setFocusableInTouchMode(true);
        setBackgroundColor(Color.BLACK);

        textPaint.setTypeface(Typeface.MONOSPACE);
        textPaint.setTextSize(28f);
        textPaint.setColor(Color.WHITE);

        Rect bounds = new Rect();
        textPaint.getTextBounds("M", 0, 1, bounds);
        charWidth = textPaint.measureText("M");
        charHeight = bounds.height() * 1.5f;
        charAscent = -textPaint.getFontMetrics().ascent;

        lines.add("");
        lineColors.add(new int[0]);

        setOnClickListener(v -> {
            InputMethodManager imm = (InputMethodManager) getContext().getSystemService(Context.INPUT_METHOD_SERVICE);
            if (imm != null) imm.showSoftInput(this, InputMethodManager.SHOW_IMPLICIT);
        });
    }

    public void setInputListener(InputListener listener) {
        this.inputListener = listener;
    }

    public int getCols() {
        if (charWidth <= 0) return DEFAULT_COLS;
        return Math.max(1, (int) (getWidth() / charWidth));
    }

    public int getRows() {
        if (charHeight <= 0) return DEFAULT_ROWS;
        return Math.max(1, (int) (getHeight() / charHeight));
    }

    public void appendData(byte[] data) {
        String text = new String(data, StandardCharsets.UTF_8);
        parseAnsi(text);
        trimLines();
        scrollToBottom();
        postInvalidate();
    }

    private void parseAnsi(String text) {
        int i = 0;
        while (i < text.length()) {
            char c = text.charAt(i);
            if (c == '\u001B' && i + 1 < text.length() && text.charAt(i + 1) == '[') {
                int end = text.indexOf('m', i + 2);
                if (end != -1) {
                    String codes = text.substring(i + 2, end);
                    applySgr(codes);
                    i = end + 1;
                    continue;
                }
            }
            if (c == '\r') {
                i++;
                continue;
            }
            if (c == '\n') {
                commitCurrentLine();
                i++;
                continue;
            }
            if (c == '\b') {
                if (currentLine.length() > 0) {
                    currentLine.deleteCharAt(currentLine.length() - 1);
                    if (!currentLineColors.isEmpty()) currentLineColors.remove(currentLineColors.size() - 1);
                }
                i++;
                continue;
            }
            if (c == '\u001B') {
                // Skip until letter
                i++;
                while (i < text.length() && !Character.isLetter(text.charAt(i))) i++;
                i++;
                continue;
            }
            currentLine.append(c);
            currentLineColors.add(currentFg);
            i++;
        }
        // Update last display line
        updateLastLine();
    }

    private void applySgr(String codes) {
        if (codes.isEmpty() || codes.equals("0")) {
            currentFg = Color.WHITE;
            return;
        }
        String[] parts = codes.split(";");
        for (String part : parts) {
            try {
                int code = Integer.parseInt(part.trim());
                if (code == 0) { currentFg = Color.WHITE; }
                else if (code >= 30 && code <= 37) { currentFg = ANSI_COLORS[code - 30]; }
                else if (code >= 90 && code <= 97) { currentFg = ANSI_COLORS[code - 90 + 8]; }
                else if (code == 39) { currentFg = Color.WHITE; }
            } catch (NumberFormatException ignored) {
            }
        }
    }

    private void commitCurrentLine() {
        int idx = lines.size() - 1;
        if (idx >= 0) {
            lines.set(idx, currentLine.toString());
            int[] colors = new int[currentLineColors.size()];
            for (int k = 0; k < colors.length; k++) colors[k] = currentLineColors.get(k);
            lineColors.set(idx, colors);
        }
        currentLine.setLength(0);
        currentLineColors.clear();
        lines.add("");
        lineColors.add(new int[0]);
    }

    private void updateLastLine() {
        int idx = lines.size() - 1;
        if (idx >= 0) {
            lines.set(idx, currentLine.toString());
            int[] colors = new int[currentLineColors.size()];
            for (int k = 0; k < colors.length; k++) colors[k] = currentLineColors.get(k);
            lineColors.set(idx, colors);
        }
    }

    private void trimLines() {
        while (lines.size() > MAX_LINES) {
            lines.remove(0);
            lineColors.remove(0);
        }
    }

    private void scrollToBottom() {
        int rows = getRows();
        scrollOffset = Math.max(0, lines.size() - rows);
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        int rows = getRows();
        int startLine = scrollOffset;
        int endLine = Math.min(startLine + rows, lines.size());

        for (int row = startLine; row < endLine; row++) {
            float y = (row - startLine) * charHeight + charAscent;
            String line = lines.get(row);
            int[] colors = lineColors.get(row);
            float x = 0;
            for (int col = 0; col < line.length(); col++) {
                textPaint.setColor(col < colors.length ? colors[col] : Color.WHITE);
                canvas.drawText(String.valueOf(line.charAt(col)), x, y, textPaint);
                x += charWidth;
            }
        }
    }

    public void clear() {
        lines.clear();
        lineColors.clear();
        currentLine.setLength(0);
        currentLineColors.clear();
        lines.add("");
        lineColors.add(new int[0]);
        scrollOffset = 0;
        invalidate();
    }

    @Override
    public InputConnection onCreateInputConnection(EditorInfo outAttrs) {
        TerminalInputConnection.applyEditorInfo(outAttrs);
        return new TerminalInputConnection(this, inputListener);
    }

    @Override
    public boolean onKeyPreIme(int keyCode, KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_DOWN && keyCode == KeyEvent.KEYCODE_BACK) {
            return super.onKeyPreIme(keyCode, event);
        }
        if (event.getAction() == KeyEvent.ACTION_DOWN && inputListener != null) {
            int unicode = event.getUnicodeChar(event.getMetaState());
            if (unicode > 0) {
                inputListener.onInput(new String(Character.toChars(unicode)).getBytes(StandardCharsets.UTF_8));
                return true;
            }
        }
        return super.onKeyPreIme(keyCode, event);
    }

    public void showSoftKeyboard() {
        requestFocus();
        InputMethodManager imm = (InputMethodManager) getContext().getSystemService(Context.INPUT_METHOD_SERVICE);
        if (imm != null) {
            imm.showSoftInput(this, InputMethodManager.SHOW_IMPLICIT);
        }
    }

    public void toggleSoftKeyboard() {
        requestFocus();
        InputMethodManager imm = (InputMethodManager) getContext().getSystemService(Context.INPUT_METHOD_SERVICE);
        if (imm != null) {
            imm.toggleSoftInput(InputMethodManager.SHOW_FORCED, 0);
        }
    }

    @Override
    public boolean onCheckIsTextEditor() {
        return true;
    }
}
