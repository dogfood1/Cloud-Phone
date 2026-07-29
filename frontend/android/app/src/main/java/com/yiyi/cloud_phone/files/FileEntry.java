package com.yiyi.cloud_phone.files;

import org.json.JSONObject;

final class FileEntry {
    static final String TYPE_DIRECTORY = "directory";
    static final String TYPE_FILE = "file";
    static final String TYPE_SYMLINK = "symlink";

    final String name;
    final String type;
    final long size;
    final String modified;
    final String linkTarget;

    FileEntry(JSONObject json) {
        name = json.optString("name", "");
        type = json.optString("type", TYPE_FILE);
        size = json.optLong("size", 0);
        modified = json.optString("modified", "");
        linkTarget = json.optString("linkTarget", "");
    }

    boolean isDirectory() {
        return TYPE_DIRECTORY.equals(type);
    }

    boolean isFile() {
        return TYPE_FILE.equals(type);
    }

    boolean isSymlink() {
        return TYPE_SYMLINK.equals(type);
    }
}
