/** scrcpy audio.md: playback + audio-dup require Android 13 (API 33). */

export const ANDROID_SDK_AUDIO_DUP_MIN = 33;
export const ANDROID_SDK_WEB_PCM_MIN = 30;

/**
 * @param {number | string | null | undefined} sdkVersion
 */
export function parseDeviceSdk(sdkVersion) {
  const sdk = Number(sdkVersion);

  if (!Number.isFinite(sdk) || sdk <= 0) {
    return 0;
  }

  return Math.trunc(sdk);
}

/**
 * @param {number | string | null | undefined} sdkVersion
 */
export function isAudioDupSupported(sdkVersion) {
  const sdk = parseDeviceSdk(sdkVersion);

  return sdk === 0 || sdk >= ANDROID_SDK_AUDIO_DUP_MIN;
}

/**
 * escrcpy: --audio-dup implies --audio-source=playback (Android 13+ only).
 *
 * @param {{ source?: string, audioDup?: boolean, disabled?: boolean }} audio
 * @param {number | string | null | undefined} deviceSdk
 */
export function resolveAudioStreamParams(audio = {}, deviceSdk = 0) {
  const sdk = parseDeviceSdk(deviceSdk);
  let source = String(audio.source ?? "output").trim() || "output";
  let audioDup = Boolean(audio.audioDup);

  if (audioDup) {
    if (sdk > 0 && sdk < ANDROID_SDK_AUDIO_DUP_MIN) {
      audioDup = false;
    } else {
      source = "playback";
    }
  }

  if (source === "playback" && sdk > 0 && sdk < ANDROID_SDK_AUDIO_DUP_MIN) {
    source = "output";
  }

  return { source, audioDup };
}
