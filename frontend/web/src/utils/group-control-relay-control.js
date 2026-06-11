import {
  CONTROL_MSG_TYPE,
  serializeInjectScroll,
  serializeInjectTouch,
} from "./ws-scrcpy-control.js";

function cloneBuffer(buffer) {
  return buffer.slice();
}

function scalePoint(x, y, fromW, fromH, toW, toH) {
  if (!fromW || !fromH || !toW || !toH) {
    return { x, y };
  }

  return {
    x: Math.round((x / fromW) * toW),
    y: Math.round((y / fromH) * toH),
  };
}

/**
 * Rescale touch/scroll control messages from master screen size to follower size.
 * Other control messages are forwarded unchanged.
 */
export function relayControlBuffer(buffer, masterSize, followerSize) {
  if (!buffer?.length) {
    return null;
  }

  const type = buffer[0];
  const masterW = masterSize?.width ?? 0;
  const masterH = masterSize?.height ?? 0;
  const followerW = followerSize?.width ?? masterW;
  const followerH = followerSize?.height ?? masterH;

  if (type === CONTROL_MSG_TYPE.INJECT_TOUCH_EVENT && buffer.length >= 32) {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const action = view.getUint8(1);
    const pointerId = view.getBigUint64(2, false);
    const x = view.getUint32(10, false);
    const y = view.getUint32(14, false);
    const msgW = view.getUint16(18, false);
    const msgH = view.getUint16(20, false);
    const pressure = view.getUint16(22, false) / 0xffff;
    const actionButton = view.getUint32(24, false);
    const buttons = view.getUint32(28, false);
    const fromW = msgW || masterW;
    const fromH = msgH || masterH;
    const point = scalePoint(x, y, fromW, fromH, followerW, followerH);

    return serializeInjectTouch({
      action,
      point,
      screenSize: { width: followerW, height: followerH },
      pointerId,
      pressure,
      actionButton,
      buttons,
    });
  }

  if (type === CONTROL_MSG_TYPE.INJECT_SCROLL_EVENT && buffer.length >= 21) {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const x = view.getUint32(1, false);
    const y = view.getUint32(5, false);
    const msgW = view.getUint16(9, false);
    const msgH = view.getUint16(11, false);
    const hscroll = view.getInt16(13, false) / 0x8000 * 16;
    const vscroll = view.getInt16(15, false) / 0x8000 * 16;
    const fromW = msgW || masterW;
    const fromH = msgH || masterH;
    const point = scalePoint(x, y, fromW, fromH, followerW, followerH);

    return serializeInjectScroll({
      point,
      screenSize: { width: followerW, height: followerH },
      hscroll,
      vscroll,
    });
  }

  return cloneBuffer(buffer);
}
