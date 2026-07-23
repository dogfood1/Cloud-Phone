import { runAdb } from "./adb-command.js";

const LANDSCAPE_TOKENS = new Set([
  "0",
  "6",
  "8",
  "11",
  "landscape",
  "sensorlandscape",
  "reverselandscape",
  "userlandscape",
]);

/**
 * Infer launch orientation from dumpsys package screenOrientation values.
 * @param {string} serial
 * @param {string} packageName
 * @returns {Promise<"portrait" | "landscape">}
 */
export async function resolveAppOrientation(serial, packageName) {
  const pkg = String(packageName || "").trim();
  if (!pkg || !serial) {
    return "portrait";
  }

  try {
    const { stdout } = await runAdb(
      ["-s", serial, "shell", "dumpsys", "package", pkg],
      { timeout: 20_000, maxBuffer: 8 * 1024 * 1024 },
    );
    return orientationFromDumpsys(stdout || "");
  } catch {
    return "portrait";
  }
}

/**
 * @param {string} text
 * @returns {"portrait" | "landscape"}
 */
export function orientationFromDumpsys(text) {
  const matches = String(text).matchAll(/screenOrientation[=:](-?\d+|\w+)/gi);
  let landscapeHits = 0;
  let portraitHits = 0;

  for (const match of matches) {
    const token = String(match[1] || "").trim().toLowerCase();
    if (!token || token === "-1" || token === "unspecified" || token === "3") {
      continue;
    }
    if (LANDSCAPE_TOKENS.has(token)) {
      landscapeHits += 1;
    } else if (
      token === "1" ||
      token === "7" ||
      token === "9" ||
      token === "12" ||
      token.includes("portrait")
    ) {
      portraitHits += 1;
    }
  }

  if (landscapeHits > 0 && landscapeHits >= portraitHits) {
    return "landscape";
  }
  return "portrait";
}
