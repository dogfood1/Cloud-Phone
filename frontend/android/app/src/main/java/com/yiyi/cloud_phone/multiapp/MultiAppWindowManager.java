package com.yiyi.cloud_phone.multiapp;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public final class MultiAppWindowManager {
    public interface Listener {
        void onWindowsChanged();

        void onFocusChanged(String windowId);
    }

    private final List<MultiAppWindowState> windows = new ArrayList<>();
    private String focusedId = "";
    private int zCounter = 10;
    private int windowSeq;
    private Listener listener;

    void setListener(Listener listener) {
        this.listener = listener;
    }

    List<MultiAppWindowState> windows() {
        return Collections.unmodifiableList(windows);
    }

    String focusedId() {
        return focusedId;
    }

    MultiAppWindowState find(String id) {
        for (MultiAppWindowState win : windows) {
            if (win.id.equals(id)) {
                return win;
            }
        }
        return null;
    }

    MultiAppWindowState openOrFocusApp(
            String packageName,
            String label,
            String orientation,
            String iconDataUrl,
            String activity,
            int canvasW,
            int canvasH
    ) {
        for (MultiAppWindowState existing : windows) {
            if (existing.packageName.equals(packageName)) {
                focusWindow(existing.id);
                existing.minimized = false;
                if (iconDataUrl != null && !iconDataUrl.isEmpty()) {
                    existing.iconDataUrl = iconDataUrl;
                }
                notifyChanged();
                return existing;
            }
        }
        if (!"landscape".equals(orientation)) {
            orientation = "portrait";
        }
        MultiAppWindowLayout.Bounds bounds = MultiAppWindowLayout.defaultWindowBounds(
                canvasW,
                canvasH,
                windows.size(),
                orientation
        );
        MultiAppWindowState win = new MultiAppWindowState(
                "win-" + (++windowSeq),
                packageName,
                label == null || label.isEmpty() ? packageName : label,
                orientation,
                bounds.vdWidth,
                bounds.vdHeight,
                bounds.vdDpi,
                bounds.x,
                bounds.y,
                bounds.width,
                bounds.height,
                ++zCounter
        );
        win.iconDataUrl = iconDataUrl;
        win.activity = activity;
        windows.add(win);
        focusedId = win.id;
        notifyChanged();
        notifyFocus(win.id);
        return win;
    }

    void focusWindow(String id) {
        MultiAppWindowState win = find(id);
        if (win == null) {
            return;
        }
        boolean wasMinimized = win.minimized;
        win.zIndex = ++zCounter;
        win.minimized = false;
        focusedId = id;
        // Avoid rebinding chrome mid-drag; only rebuild when restoring a minimized window.
        if (wasMinimized) {
            notifyChanged();
        }
        notifyFocus(id);
    }

    void minimizeWindow(String id) {
        MultiAppWindowState win = find(id);
        if (win == null) {
            return;
        }
        win.minimized = true;
        if (focusedId.equals(id)) {
            focusedId = "";
            MultiAppWindowState next = null;
            for (MultiAppWindowState item : windows) {
                if (!item.minimized && (next == null || item.zIndex > next.zIndex)) {
                    next = item;
                }
            }
            if (next != null) {
                focusedId = next.id;
            }
        }
        notifyChanged();
    }

    void toggleMaximize(String id, int canvasW, int canvasH) {
        MultiAppWindowState win = find(id);
        if (win == null) {
            return;
        }
        focusWindow(id);
        if (win.maximized) {
            win.maximized = false;
            if (win.hasRestore) {
                win.x = win.restoreX;
                win.y = win.restoreY;
                win.width = win.restoreW;
                win.height = win.restoreH;
            }
            syncVdSize(win);
            notifyChanged();
            return;
        }
        win.hasRestore = true;
        win.restoreX = win.x;
        win.restoreY = win.y;
        win.restoreW = win.width;
        win.restoreH = win.height;
        win.maximized = true;
        win.minimized = false;
        win.x = 0;
        win.y = 0;
        win.width = Math.max(MultiAppWindowState.MIN_W, canvasW);
        win.height = Math.max(MultiAppWindowState.MIN_H + MultiAppWindowState.titleBarHeight(), canvasH);
        syncVdSize(win);
        notifyChanged();
    }

    void closeWindow(String id) {
        windows.removeIf(item -> item.id.equals(id));
        if (focusedId.equals(id)) {
            focusedId = "";
            MultiAppWindowState next = null;
            for (MultiAppWindowState item : windows) {
                if (!item.minimized && (next == null || item.zIndex > next.zIndex)) {
                    next = item;
                }
            }
            if (next != null) {
                focusedId = next.id;
            }
        }
        notifyChanged();
    }

    void updateBounds(String id, int x, int y, int width, int height) {
        MultiAppWindowState win = find(id);
        if (win == null || win.maximized) {
            return;
        }
        win.x = x;
        win.y = y;
        win.width = Math.max(MultiAppWindowState.MIN_W, width);
        win.height = Math.max(MultiAppWindowState.MIN_H + MultiAppWindowState.titleBarHeight(), height);
        syncVdSize(win);
        // Do not notifyChanged() — callers apply layout directly so touch listeners stay alive.
    }

    void clampToCanvas(String id, int canvasW, int canvasH) {
        MultiAppWindowState win = find(id);
        if (win == null || win.maximized || canvasW <= 0 || canvasH <= 0) {
            return;
        }
        int title = MultiAppWindowState.titleBarHeight();
        // Keep at least the title bar on-screen so the window can still be dragged back.
        int minVisible = Math.min(title, win.height);
        win.x = Math.max(-(win.width - minVisible), Math.min(win.x, canvasW - minVisible));
        win.y = Math.max(0, Math.min(win.y, canvasH - minVisible));
    }

    void setOrientation(String id, String orientation) {
        MultiAppWindowState win = find(id);
        if (win == null) {
            return;
        }
        if ("landscape".equals(orientation) || "portrait".equals(orientation)) {
            win.orientation = orientation;
        }
    }

    void syncVdSize(MultiAppWindowState win) {
        MultiAppWindowLayout.VdSize vd = MultiAppWindowLayout.resolveVdFromContent(
                win.contentWidth(),
                win.contentHeight()
        );
        win.vdWidth = vd.width;
        win.vdHeight = vd.height;
        win.vdDpi = MultiAppWindowLayout.suggestDpiForContent(win.contentWidth(), win.contentHeight());
    }

    boolean isEmpty() {
        return windows.isEmpty();
    }

    private void notifyChanged() {
        if (listener != null) {
            listener.onWindowsChanged();
        }
    }

    private void notifyFocus(String id) {
        if (listener != null) {
            listener.onFocusChanged(id);
        }
    }
}
