package com.genymobile.scrcpy.ws;

import com.genymobile.scrcpy.Options;
import com.genymobile.scrcpy.device.Device;
import com.genymobile.scrcpy.model.CodecOption;
import com.genymobile.scrcpy.model.Size;

import android.graphics.Rect;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Objects;

/** ws-scrcpy compatible stream parameters (type 101 payload). */
public class VideoSettings {

  public static final int TYPE_CHANGE_STREAM_PARAMETERS = 101;

  private static final int DEFAULT_BIT_RATE = 8_000_000;
  private static final byte DEFAULT_I_FRAME_INTERVAL = 10;

  private Size bounds;
  private int bitRate = DEFAULT_BIT_RATE;
  private int maxFps;
  private int lockedVideoOrientation;
  private byte iFrameInterval = DEFAULT_I_FRAME_INTERVAL;
  private Rect crop;
  private boolean sendFrameMeta;
  private int displayId;
  private String codecOptionsString;
  private List<CodecOption> codecOptions;
  private String encoderName;

  public static VideoSettings fromOptions(Options options) {
    VideoSettings settings = new VideoSettings();
    int displayId = options.getDisplayId();
    settings.displayId = displayId == Device.DISPLAY_ID_NONE ? 0 : displayId;
    int maxSize = options.getMaxSize();
    if (maxSize > 0) {
      settings.setBounds(maxSize, maxSize);
    }
    settings.bitRate = options.getVideoBitRate();
    settings.maxFps = (int) options.getMaxFps();
    settings.crop = options.getCrop();
    settings.encoderName = options.getVideoEncoder();
    settings.codecOptions = options.getVideoCodecOptions();
    return settings;
  }

  public int getDisplayId() {
    return displayId;
  }

  public int getBitRate() {
    return bitRate;
  }

  public int getMaxFps() {
    return maxFps;
  }

  public Size getBounds() {
    return bounds;
  }

  public List<CodecOption> getCodecOptions() {
    return codecOptions;
  }

  public String getEncoderName() {
    return encoderName;
  }

  public Rect getCrop() {
    return crop;
  }

  public void setBounds(int width, int height) {
    this.bounds = new Size(width & ~15, height & ~15);
  }

  public void setDisplayId(int displayId) {
    this.displayId = displayId;
  }

  public void merge(VideoSettings source) {
    codecOptions = source.codecOptions;
    codecOptionsString = source.codecOptionsString;
    encoderName = source.encoderName;
    bitRate = source.bitRate;
    maxFps = source.maxFps;
    iFrameInterval = source.iFrameInterval;
    bounds = source.bounds;
    crop = source.crop;
    sendFrameMeta = source.sendFrameMeta;
    lockedVideoOrientation = source.lockedVideoOrientation;
    displayId = source.displayId;
  }

  public static VideoSettings fromByteArray(byte[] bytes) {
    VideoSettings videoSettings = new VideoSettings();
    ByteBuffer data = ByteBuffer.wrap(bytes);
    videoSettings.bitRate = data.getInt();
    videoSettings.maxFps = data.getInt();
    videoSettings.iFrameInterval = data.get();
    int width = data.getShort();
    int height = data.getShort();
    int left = data.getShort();
    int top = data.getShort();
    int right = data.getShort();
    int bottom = data.getShort();
    videoSettings.sendFrameMeta = data.get() != 0;
    videoSettings.lockedVideoOrientation = data.get();
    videoSettings.displayId = data.getInt();
    if (data.remaining() > 0) {
      int codecOptionsLength = data.getInt();
      if (codecOptionsLength > 0) {
        byte[] textBuffer = new byte[codecOptionsLength];
        data.get(textBuffer);
        String codecOptionsValue = new String(textBuffer, StandardCharsets.UTF_8);
        if (!codecOptionsValue.isEmpty()) {
          videoSettings.codecOptions = CodecOption.parse(codecOptionsValue);
          videoSettings.codecOptionsString = codecOptionsValue;
        }
      }
    }
    if (data.remaining() > 0) {
      int encoderNameLength = data.getInt();
      if (encoderNameLength > 0) {
        byte[] textBuffer = new byte[encoderNameLength];
        data.get(textBuffer);
        videoSettings.encoderName = new String(textBuffer, StandardCharsets.UTF_8);
      }
    }
    videoSettings.setBounds(width, height);
    if (left != 0 || right != 0 || top != 0 || bottom != 0) {
      videoSettings.crop = new Rect(left, top, right, bottom);
    }
    return videoSettings;
  }

  public byte[] toByteArray() {
    int baseLength = 35;
    byte[] codeOptionsBytes = codecOptionsString != null ? codecOptionsString.getBytes(StandardCharsets.UTF_8) : new byte[0];
    byte[] encoderNameBytes = encoderName != null ? encoderName.getBytes(StandardCharsets.UTF_8) : new byte[0];
    ByteBuffer temp = ByteBuffer.allocate(baseLength + codeOptionsBytes.length + encoderNameBytes.length);
    temp.putInt(bitRate);
    temp.putInt(maxFps);
    temp.put(iFrameInterval);
    int width = bounds != null ? bounds.getWidth() : 0;
    int height = bounds != null ? bounds.getHeight() : 0;
    temp.putShort((short) width);
    temp.putShort((short) height);
    int left = crop != null ? crop.left : 0;
    int top = crop != null ? crop.top : 0;
    int right = crop != null ? crop.right : 0;
    int bottom = crop != null ? crop.bottom : 0;
    temp.putShort((short) left);
    temp.putShort((short) top);
    temp.putShort((short) right);
    temp.putShort((short) bottom);
    temp.put((byte) (sendFrameMeta ? 1 : 0));
    temp.put((byte) lockedVideoOrientation);
    temp.putInt(displayId);
    temp.putInt(codeOptionsBytes.length);
    if (codeOptionsBytes.length > 0) {
      temp.put(codeOptionsBytes);
    }
    temp.putInt(encoderNameBytes.length);
    if (encoderNameBytes.length > 0) {
      temp.put(encoderNameBytes);
    }
    return temp.array();
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (!(o instanceof VideoSettings)) {
      return false;
    }
    VideoSettings s = (VideoSettings) o;
    return bitRate == s.bitRate && maxFps == s.maxFps && lockedVideoOrientation == s.lockedVideoOrientation
        && iFrameInterval == s.iFrameInterval && sendFrameMeta == s.sendFrameMeta && displayId == s.displayId
        && Objects.equals(codecOptionsString, s.codecOptionsString) && Objects.equals(encoderName, s.encoderName)
        && Objects.equals(bounds, s.bounds) && Objects.equals(crop, s.crop);
  }

  @Override
  public int hashCode() {
    return Objects.hash(bitRate, maxFps, lockedVideoOrientation, iFrameInterval, sendFrameMeta, displayId,
        codecOptionsString, encoderName, bounds, crop);
  }
}
