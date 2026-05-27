import { isScrcpyAudioPacket } from "./ws-scrcpy-audio-canvas.js";
import { parseScrcpyDeviceMessage } from "./scrcpy-device-message.js";

export function isAudioOnlyCast(castOptions) {
  return castOptions?.mirror?.video?.disabled === true;
}

export function isCastAudioEnabled(castOptions) {
  if (isAudioOnlyCast(castOptions)) {
    return true;
  }

  return castOptions?.audio === true;
}

export function buildCastWebSocketUrl(serial) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/devices/${encodeURIComponent(serial)}/cast/ws`;
}

const MAGIC_INITIAL = new TextEncoder().encode("scrcpy_initial");
const MAGIC_MESSAGE = new TextEncoder().encode("scrcpy_message");

function startsWithMagic(bytes, magic) {
  if (bytes.length < magic.length) {
    return false;
  }

  for (let i = 0; i < magic.length; i += 1) {
    if (bytes[i] !== magic[i]) {
      return false;
    }
  }

  return true;
}

/**
 * @param {{
 *   player: unknown;
 *   audioPlayback: { pushPcm?: (bytes: Uint8Array) => void } | null;
 *   status: { value: string };
 *   errorMessage: { value: string };
 *   onInitialInfo: () => void;
 *   onDeviceMessage?: (message: { type: string, text?: string }) => void;
 * }} ctx
 */
export function handleWsScrcpyBinary(ctx, data) {
  const { player: nextPlayer, audioPlayback, status, errorMessage, onInitialInfo, onDeviceMessage } =
    ctx;
  const bytes = new Uint8Array(data);

  if (startsWithMagic(bytes, MAGIC_INITIAL)) {
    onInitialInfo?.();
    return;
  }

  if (startsWithMagic(bytes, MAGIC_MESSAGE)) {
    const deviceMessage = parseScrcpyDeviceMessage(bytes);

    if (deviceMessage) {
      onDeviceMessage?.(deviceMessage);
    }

    return;
  }

  if (isScrcpyAudioPacket(bytes)) {
    if (typeof nextPlayer.pushPcm === "function") {
      nextPlayer.pushPcm(bytes);
    } else {
      audioPlayback?.pushPcm?.(bytes);
    }
    return;
  }

  if (typeof nextPlayer.pushFrame === "function") {
    nextPlayer.pushFrame(bytes);
  }

  if (nextPlayer.lastError && status.value === "streaming") {
    status.value = "error";
    errorMessage.value = `H.264 解码失败：${nextPlayer.lastError}`;
  }
}
