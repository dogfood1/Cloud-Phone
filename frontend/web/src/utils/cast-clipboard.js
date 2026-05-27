export function canUseSystemClipboard() {
  return typeof navigator !== "undefined" && Boolean(navigator.clipboard?.writeText);
}

export async function writeSystemClipboard(text) {
  if (!canUseSystemClipboard()) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(String(text ?? ""));
    return true;
  } catch {
    return false;
  }
}

export async function readSystemClipboard() {
  if (!canUseSystemClipboard() || !navigator.clipboard.readText) {
    return null;
  }

  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}
