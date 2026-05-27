package com.genymobile.scrcpy.ws;

import com.genymobile.scrcpy.control.ControlConnection;
import com.genymobile.scrcpy.control.ControlMessage;
import com.genymobile.scrcpy.control.ControlMessageReader;
import com.genymobile.scrcpy.control.DeviceMessage;
import com.genymobile.scrcpy.control.DeviceMessageWriter;
import com.genymobile.scrcpy.util.Ln;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.PipedInputStream;
import java.io.PipedOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;

public final class WsControlChannel implements ControlConnection {

  private static final byte[] MAGIC_MESSAGE = "scrcpy_message".getBytes(StandardCharsets.UTF_8);

  private final PipedOutputStream controlWriteEnd;
  private final ControlMessageReader reader;
  private final WsSocketBroadcaster broadcaster;
  private final Object feedLock = new Object();

  public WsControlChannel(WsSocketBroadcaster broadcaster) throws IOException {
    this.broadcaster = broadcaster;
    PipedInputStream controlReadEnd = new PipedInputStream();
    controlWriteEnd = new PipedOutputStream(controlReadEnd);
    reader = new ControlMessageReader(controlReadEnd);
  }

  @Override
  public ControlMessage recv() throws IOException {
    return reader.read();
  }

  @Override
  public void send(DeviceMessage msg) throws IOException {
    java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
    DeviceMessageWriter writer = new DeviceMessageWriter(bos);
    writer.write(msg);
    byte[] body = bos.toByteArray();
    ByteBuffer buffer = ByteBuffer.allocate(MAGIC_MESSAGE.length + body.length);
    buffer.put(MAGIC_MESSAGE);
    buffer.put(body);
    buffer.flip();
    broadcaster.broadcast(buffer);
  }

  public void feedControl(ByteBuffer message) throws IOException {
    if (!message.hasRemaining()) {
      return;
    }
    byte[] chunk = new byte[message.remaining()];
    message.get(chunk);
    feedControl(chunk);
  }

  public void feedControl(byte[] chunk) throws IOException {
    if (chunk == null || chunk.length == 0) {
      return;
    }
    synchronized (feedLock) {
      try {
        controlWriteEnd.write(chunk);
        controlWriteEnd.flush();
      } catch (IOException e) {
        // Controller thread may have stopped; ignore further client input.
        Ln.d("Control pipe closed: " + e.getMessage());
      }
    }
  }

  public ControlMessage parseInline(ByteBuffer message) throws IOException {
    byte[] chunk = new byte[message.remaining()];
    message.get(chunk);
    return new ControlMessageReader(new ByteArrayInputStream(chunk)).read();
  }
}
