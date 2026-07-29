package com.yiyi.cloud_phone.files;

final class DeviceFilePath {
    static final String DEFAULT_PATH = "/storage/emulated/0";
    static final String ROOT = "/";

    private DeviceFilePath() {
    }

    static String normalize(String path) {
        if (path == null || path.isEmpty()) return ROOT;
        path = path.replace('\\', '/');
        if (!path.startsWith("/")) path = "/" + path;
        String[] parts = path.split("/");
        java.util.Deque<String> stack = new java.util.ArrayDeque<>();
        for (String part : parts) {
            if (part.isEmpty() || ".".equals(part)) {
                continue;
            } else if ("..".equals(part)) {
                if (!stack.isEmpty()) stack.pop();
            } else {
                stack.push(part);
            }
        }
        String[] reversed = new String[stack.size()];
        int idx = reversed.length - 1;
        for (String s : stack) reversed[idx--] = s;
        if (reversed.length == 0) return ROOT;
        return "/" + String.join("/", reversed);
    }

    static String join(String parent, String child) {
        if (child.startsWith("/")) return normalize(child);
        return normalize(parent + "/" + child);
    }

    static String parent(String path) {
        String normalized = normalize(path);
        if (ROOT.equals(normalized)) return ROOT;
        int lastSlash = normalized.lastIndexOf('/');
        if (lastSlash <= 0) return ROOT;
        return normalized.substring(0, lastSlash);
    }
}
