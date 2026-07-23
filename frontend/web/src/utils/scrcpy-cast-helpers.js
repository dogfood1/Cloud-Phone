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

export function buildCastWebSocketUrl(serial, sessionKeyOrMeta) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;

  // Prefer backend-provided wsPath (includes sessionKey query for isolate mode).
  if (sessionKeyOrMeta && typeof sessionKeyOrMeta === "object") {
    const wsPath = sessionKeyOrMeta.wsPath;
    if (typeof wsPath === "string" && wsPath.startsWith("/")) {
      return `${protocol}//${host}${wsPath}`;
    }
    const key = sessionKeyOrMeta.sessionKey;
    if (key && key !== serial) {
      return `${protocol}//${host}/api/devices/${encodeURIComponent(serial)}/cast/ws?sessionKey=${encodeURIComponent(key)}`;
    }
  }

  if (typeof sessionKeyOrMeta === "string" && sessionKeyOrMeta && sessionKeyOrMeta !== serial) {
    return `${protocol}//${host}/api/devices/${encodeURIComponent(serial)}/cast/ws?sessionKey=${encodeURIComponent(sessionKeyOrMeta)}`;
  }

  return `${protocol}//${host}/api/devices/${encodeURIComponent(serial)}/cast/ws`;
}

export function buildCastWebSocketCandidates(serial, sessionKeyOrMeta) {
  return [buildCastWebSocketUrl(serial, sessionKeyOrMeta)];
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
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

  // Hot path: Annex-B video starts with 00 00 — skip magic string scans.
  if (bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x00) {
    if (typeof nextPlayer.pushFrame === "function") {
      nextPlayer.pushFrame(bytes);
    }
    if (nextPlayer.lastError && status.value === "streaming") {
      status.value = "error";
      errorMessage.value = `H.264 解码失败：${nextPlayer.lastError}`;
    }
    return;
  }

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
  }
}
