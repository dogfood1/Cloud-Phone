package com.yiyi.cloud_phone.cast;

import org.json.JSONArray;
import org.json.JSONObject;

final class CastStartupLogReader {
    private int consumedCount;

    CastStartupLogReader() {
        consumedCount = 0;
    }

    int appendNewEntries(CastStartupLog log, JSONArray entries) {
        if (log == null || entries == null) {
            return 0;
        }
        int added = 0;
        for (int index = consumedCount; index < entries.length(); index += 1) {
            JSONObject entry = entries.optJSONObject(index);
            if (entry == null) {
                continue;
            }
            String message = entry.optString("message", "");
            if (!message.isEmpty()) {
                log.append(message);
                added += 1;
            }
        }
        consumedCount = entries.length();
        return added;
    }

    void reset() {
        consumedCount = 0;
    }
}
