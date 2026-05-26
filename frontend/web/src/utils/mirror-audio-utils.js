import {
  DEFAULT_AUDIO_CODEC,
  FALLBACK_AUDIO_CODE_OPTIONS,
} from "./mirror-audio-constants.js";

const AUDIO_CODEC_ORDER = { opus: 0, aac: 1, flac: 2, raw: 3 };

/**
 * escrcpy `--audio-code` combined value: `opus & c2.android.opus.encoder` or `raw`
 * @param {string} audioCode
 */
export function parseAudioCodeValue(audioCode) {
  const raw = String(audioCode ?? "").trim();

  if (!raw || raw === "output") {
    return { codec: DEFAULT_AUDIO_CODEC, encoder: "" };
  }

  if (!raw.includes("&")) {
    return { codec: raw.toLowerCase(), encoder: "" };
  }

  const [codecPart, encoderPart] = raw.split("&").map((part) => part.trim());

  return {
    codec: (codecPart || DEFAULT_AUDIO_CODEC).toLowerCase(),
    encoder: encoderPart || "",
  };
}

/**
 * @param {string} codec
 * @param {string} encoder
 */
export function formatAudioCodeValue(codec, encoder) {
  const c = String(codec ?? DEFAULT_AUDIO_CODEC).toLowerCase();

  if (!encoder || c === "raw") {
    return c;
  }

  return `${c} & ${encoder}`;
}

/**
 * @param {{ codec?: string, value: string, label?: string }} item
 */
export function formatAudioCodeLabel(item) {
  const codec = String(item.codec ?? DEFAULT_AUDIO_CODEC).toUpperCase();
  const name = item.label || item.encoder || item.value;

  if (item.codec === "raw" || item.value === "raw") {
    return "raw（PCM 16-bit LE）";
  }

  if (item.encoder) {
    return `${codec} - ${item.encoder}`;
  }

  return `${codec}（自动编码器）`;
}

/**
 * @param {{ codec?: string, value: string, encoder?: string, label?: string }[]} deviceEncoders
 */
export function buildAudioCodeOptions(deviceEncoders = []) {
  const options = [];
  const seen = new Set();

  const push = (entry) => {
    const value = entry.value || formatAudioCodeValue(entry.codec, entry.encoder);

    if (seen.has(value)) {
      return;
    }

    seen.add(value);
    options.push({
      value,
      codec: String(entry.codec ?? DEFAULT_AUDIO_CODEC).toLowerCase(),
      encoder: entry.encoder || "",
      label: formatAudioCodeLabel({ ...entry, value }),
    });
  };

  for (const item of deviceEncoders) {
    if (item.codec && item.value) {
      push({
        codec: item.codec,
        encoder: item.value,
        value: formatAudioCodeValue(item.codec, item.value),
        label: item.label,
      });
    }
  }

  for (const item of FALLBACK_AUDIO_CODE_OPTIONS) {
    push(item);
  }

  options.sort((left, right) => {
    const lo = AUDIO_CODEC_ORDER[left.codec] ?? 9;
    const ro = AUDIO_CODEC_ORDER[right.codec] ?? 9;

    if (lo !== ro) {
      return lo - ro;
    }

    return left.label.localeCompare(right.label);
  });

  return options;
}

/**
 * @param {string} audioCode
 * @param {ReturnType<typeof buildAudioCodeOptions>} options
 */
export function resolveAudioCode(audioCode, options = []) {
  const normalized = String(audioCode ?? "").trim();

  if (normalized && options.some((item) => item.value === normalized)) {
    return normalized;
  }

  return options[0]?.value ?? "opus";
}

/**
 * @param {{ audio: Record<string, unknown> }} settings
 * @param {{ value: string, codec: string, encoder?: string }} option
 */
export function applyAudioCodeSelection(settings, option) {
  if (!option) {
    return;
  }

  settings.audio.audioCode = option.value;
  settings.audio.codec = option.codec;
  settings.audio.encoder = option.encoder ?? "";
}

/**
 * @param {{ audio: Record<string, unknown> }} settings
 * @param {ReturnType<typeof buildAudioCodeOptions>} options
 */
export function ensureDefaultAudioCode(settings, options) {
  if (!options.length) {
    return;
  }

  const resolved = resolveAudioCode(settings.audio.audioCode, options);
  const match = options.find((item) => item.value === resolved);

  if (match) {
    applyAudioCodeSelection(settings, match);
  }
}
