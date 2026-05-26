package com.genymobile.scrcpy.ws;

import com.genymobile.scrcpy.device.Device;
import com.genymobile.scrcpy.display.DisplayInfo;
import com.genymobile.scrcpy.util.CodecUtils;
import com.genymobile.scrcpy.wrappers.ServiceManager;

import android.media.MediaCodecInfo;
import android.media.MediaCodecList;
import android.media.MediaFormat;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

public final class WsInitialInfo {

  private static final byte[] MAGIC_INITIAL = "scrcpy_initial".getBytes(StandardCharsets.UTF_8);
  private static final int DEVICE_NAME_FIELD_LENGTH = 64;

  private WsInitialInfo() {
  }

  public static ByteBuffer build(Map<Integer, WsCastSession> sessionsByDisplay) {
    int[] displayIds = ServiceManager.getDisplayManager().getDisplayIds();
    Map<Integer, DisplayInfo> displayInfoMap = new HashMap<>();
    int additional = 0;
    for (int displayId : displayIds) {
      DisplayInfo info = ServiceManager.getDisplayManager().getDisplayInfo(displayId);
      if (info != null) {
        displayInfoMap.put(displayId, info);
        additional += info.toWsByteArray().length + 12;
        WsCastSession session = sessionsByDisplay.get(displayId);
        if (session != null) {
          additional += session.getScreenInfoBytes().length + session.getVideoSettings().toByteArray().length;
        }
      }
    }

    MediaCodecList codecList = new MediaCodecList(MediaCodecList.REGULAR_CODECS);
    MediaCodecInfo[] encoders = CodecUtils.getEncoders(codecList, MediaFormat.MIMETYPE_VIDEO_AVC);
    int encoderBlock = 4;
    byte[][] encoderNames = new byte[encoders.length][];
    for (int i = 0; i < encoders.length; i++) {
      encoderNames[i] = encoders[i].getName().getBytes(StandardCharsets.UTF_8);
      encoderBlock += 4 + encoderNames[i].length;
    }

    int base = MAGIC_INITIAL.length + DEVICE_NAME_FIELD_LENGTH + 4 + 4;
    byte[] deviceName = Device.getDeviceName().getBytes(StandardCharsets.UTF_8);
    byte[] bytes = new byte[base + additional + encoderBlock];
    ByteBuffer buffer = ByteBuffer.wrap(bytes);
    buffer.put(MAGIC_INITIAL);
    buffer.put(deviceName, 0, Math.min(DEVICE_NAME_FIELD_LENGTH - 1, deviceName.length));
    buffer.position(MAGIC_INITIAL.length + DEVICE_NAME_FIELD_LENGTH);
    buffer.putInt(displayIds.length);

    for (int displayId : displayIds) {
      DisplayInfo info = displayInfoMap.get(displayId);
      if (info == null) {
        continue;
      }
      buffer.put(info.toWsByteArray());
      WsCastSession session = sessionsByDisplay.get(displayId);
      int connections = session != null ? session.getClientCount() : 0;
      buffer.putInt(connections);
      byte[] screenInfo = session != null ? session.getScreenInfoBytes() : new byte[0];
      buffer.putInt(screenInfo.length);
      if (screenInfo.length > 0) {
        buffer.put(screenInfo);
      }
      byte[] videoSettings = session != null ? session.getVideoSettings().toByteArray() : new byte[0];
      buffer.putInt(videoSettings.length);
      if (videoSettings.length > 0) {
        buffer.put(videoSettings);
      }
    }

    buffer.putInt(encoderNames.length);
    for (byte[] name : encoderNames) {
      buffer.putInt(name.length);
      buffer.put(name);
    }

    buffer.putInt(0); // client id placeholder — patched per socket on send
    buffer.flip();
    return buffer;
  }

  public static void sendTo(WebSocketHolder holder, ByteBuffer template, int clientId) {
    ByteBuffer copy = template.duplicate();
    copy.position(copy.capacity() - 4);
    copy.putInt(clientId);
    copy.rewind();
    holder.socket.send(copy);
  }

  public static final class WebSocketHolder {
    final org.java_websocket.WebSocket socket;
    final int clientId;

    WebSocketHolder(org.java_websocket.WebSocket socket, int clientId) {
      this.socket = socket;
      this.clientId = clientId;
    }
  }
}
