const BOOLEAN_FLAGS = new Set([
  "no-audio",
  "no-video",
  "no-control",
  "no-window",
  "turn-screen-off",
  "stay-awake",
  "fullscreen",
  "show-touches",
  "otg",
  "tcpip",
  "select-usb",
  "select-tcpip",
  "no-video-playback",
  "no-audio-playback",
  "print-fps",
  "list-encoders",
  "list-displays",
  "list-cameras",
  "list-camera-sizes",
  "list-apps",
  "cloud-phone-capabilities",
]);

export function buildScrcpyCliArgs(options = {}) {
  const args = [];
  const serial = options.serial ?? options.udid;

  if (serial) {
    args.push(`--serial=${serial}`);
  }

  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === null || key === "serial" || key === "udid") {
      continue;
    }

    const flag = toKebabFlag(key);

    if (BOOLEAN_FLAGS.has(flag)) {
      if (value === true) {
        args.push(`--${flag}`);
      }

      continue;
    }

    if (typeof value === "boolean") {
      if (value) {
        args.push(`--${flag}`);
      }

      continue;
    }

    args.push(`--${flag}=${String(value)}`);
  }

  return args;
}

function toKebabFlag(key) {
  return String(key)
    .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
    .replace(/_/g, "-");
}
