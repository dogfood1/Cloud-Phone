export const TYPE_CHANGE_STREAM_PARAMETERS = 101;

const BASE_LENGTH = 35;

function writeI32BE(view, offset, value) {
  view.setInt32(offset, value, false);
}

function writeI16BE(view, offset, value) {
  view.setInt16(offset, value, false);
}

export function serializeVideoSettings({
  bitRate = 8_000_000,
  maxFps = 60,
  iFrameInterval = 10,
  width = 0,
  height = 0,
  displayId = 0,
  lockedVideoOrientation = -1,
  sendFrameMeta = false,
  codecOptions = "",
  encoderName = "",
} = {}) {
  const codecBytes = codecOptions ? new TextEncoder().encode(codecOptions) : new Uint8Array(0);
  const encoderBytes = encoderName ? new TextEncoder().encode(encoderName) : new Uint8Array(0);
  const total = BASE_LENGTH + codecBytes.length + encoderBytes.length;
  const buffer = new ArrayBuffer(total);
  const view = new DataView(buffer);
  let offset = 0;

  writeI32BE(view, offset, bitRate);
  offset += 4;
  writeI32BE(view, offset, maxFps);
  offset += 4;
  view.setInt8(offset, iFrameInterval);
  offset += 1;
  writeI16BE(view, offset, width);
  offset += 2;
  writeI16BE(view, offset, height);
  offset += 2;
  writeI16BE(view, offset, 0);
  offset += 2;
  writeI16BE(view, offset, 0);
  offset += 2;
  writeI16BE(view, offset, 0);
  offset += 2;
  writeI16BE(view, offset, 0);
  offset += 2;
  view.setInt8(offset, sendFrameMeta ? 1 : 0);
  offset += 1;
  view.setInt8(offset, lockedVideoOrientation);
  offset += 1;
  writeI32BE(view, offset, displayId);
  offset += 4;
  writeI32BE(view, offset, codecBytes.length);
  offset += 4;
  if (codecBytes.length) {
    new Uint8Array(buffer, offset, codecBytes.length).set(codecBytes);
    offset += codecBytes.length;
  }
  writeI32BE(view, offset, encoderBytes.length);
  offset += 4;
  if (encoderBytes.length) {
    new Uint8Array(buffer, offset, encoderBytes.length).set(encoderBytes);
  }

  return new Uint8Array(buffer);
}

export function serializeChangeStreamParameters(settings) {
  const body = serializeVideoSettings(settings);
  const message = new Uint8Array(1 + body.length);
  message[0] = TYPE_CHANGE_STREAM_PARAMETERS;
  message.set(body, 1);
  return message;
}

export function videoSettingsFromCastOptions(castOptions = {}, sessionMeta = null) {
  const mirror = castOptions.mirror?.video ?? castOptions.mirror ?? {};
  const maxSize =
    Number(castOptions.maxSize) ||
    Number(sessionMeta?.castOptions?.maxSize) ||
    1080;
  const bitRateMbps = Number(mirror.bitRateMbps ?? 8);
  const maxFps = Number(mirror.maxFps ?? 60);

  return {
    bitRate: Math.round(bitRateMbps * 1_000_000),
    maxFps,
    width: maxSize & ~15,
    height: maxSize & ~15,
    displayId: Number(castOptions.mirror?.screen?.displayId ?? 0) || 0,
    encoderName: String(mirror.encoder ?? ""),
  };
}
