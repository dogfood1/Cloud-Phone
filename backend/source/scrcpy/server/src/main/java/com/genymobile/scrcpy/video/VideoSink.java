package com.genymobile.scrcpy.video;

import com.genymobile.scrcpy.model.Codec;

import android.media.MediaCodec;

import java.io.IOException;
import java.nio.ByteBuffer;

/**
 * Video output sink used by {@link SurfaceEncoder} (local socket or WebSocket).
 */
public interface VideoSink {

    Codec getCodec();

    void writeVideoHeader() throws IOException;

    void writeSessionMeta(int width, int height, boolean isClientResize) throws IOException;

    void writePacket(ByteBuffer buffer, MediaCodec.BufferInfo bufferInfo) throws IOException;

    /** Optional: notify web clients that video capture failed fatally. */
    default void notifyCastError(String code, String message) {
        // no-op for classic TCP streamers
    }
}
