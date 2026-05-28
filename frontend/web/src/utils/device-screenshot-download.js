import { fetchEncryptedBinary } from "./api.js";

export async function downloadDeviceScreenshot(serial, displayName = serial) {
  const url = `/api/devices/${encodeURIComponent(serial)}/screenshot?t=${Date.now()}`;

  try {
    const blob = await fetchEncryptedBinary(url, { mime: "image/png" });
    const safeName = String(displayName).replace(/[^\w\u4e00-\u9fff.-]+/g, "_");
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `${safeName}-${Date.now()}.png`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "截屏失败");
  }
}
