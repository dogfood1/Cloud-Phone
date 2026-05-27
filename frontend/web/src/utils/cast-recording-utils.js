export function formatRecordingDuration(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** @param {"mp4" | "mp3"} extension */
export function downloadRecordingBlob(blob, displayName = "recording", extension = "mp4") {
  const safeName = String(displayName).replace(/[^\w\u4e00-\u9fff.-]+/g, "_");
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = `${safeName}-${Date.now()}.${extension}`;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export function pickMediaRecorderMimeType(candidates) {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return "";
  }

  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return "";
}
