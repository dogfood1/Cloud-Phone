import {
  wdaDrag,
  wdaHomescreen,
  wdaLock,
  wdaPressButton,
  wdaTap,
  wdaUnlock,
} from "../ios/ios-wda-client.js";

const BUTTON_MAP = {
  home: "home",
  power: "home",
  "volume-up": "volumeUp",
  "volume-down": "volumeDown",
  "screen-off": "home",
};

/**
 * @param {{ endpoint: { host: string, httpPort: number } }} session
 * @param {Record<string, unknown>} message
 */
export async function handleIosTouchMessage(session, message) {
  const endpoint = session.endpoint;
  const type = String(message?.type ?? "").toLowerCase();

  if (type === "touchdown" || type === "touch_down") {
    session.touchStart = { x: message.x, y: message.y };
    return;
  }

  if (type === "touchmove" || type === "touch_move") {
    session.touchLast = { x: message.x, y: message.y };
    return;
  }

  if (type === "touchup" || type === "touch_up" || type === "click" || type === "tap") {
    const start = session.touchStart ?? { x: message.x, y: message.y };
    const end = session.touchLast ?? { x: message.x, y: message.y };
    session.touchStart = null;
    session.touchLast = null;

    const dx = Math.abs(Number(end.x) - Number(start.x));
    const dy = Math.abs(Number(end.y) - Number(start.y));

    if (dx > 8 || dy > 8) {
      await wdaDrag(endpoint.host, endpoint.httpPort, start.x, start.y, end.x, end.y);
      return;
    }

    await wdaTap(endpoint.host, endpoint.httpPort, end.x, end.y);
    return;
  }

  if (type === "swipe") {
    await wdaDrag(
      endpoint.host,
      endpoint.httpPort,
      message.x1,
      message.y1,
      message.x2,
      message.y2,
    );
    return;
  }

  if (type === "navigation") {
    const actionId = String(message.actionId ?? "");

    if (actionId === "home") {
      await wdaHomescreen(endpoint.host, endpoint.httpPort);
      return;
    }

    if (actionId === "screen-off") {
      await wdaLock(endpoint.host, endpoint.httpPort);
      return;
    }

    if (actionId === "screen-on") {
      await wdaUnlock(endpoint.host, endpoint.httpPort);
      return;
    }

    const button = BUTTON_MAP[actionId];

    if (button) {
      await wdaPressButton(endpoint.host, endpoint.httpPort, button);
    }
  }
}
