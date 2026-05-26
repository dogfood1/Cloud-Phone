export async function downloadDeviceScreenshot(serial, displayName = serial) {
  const url = `/api/devices/${encodeURIComponent(serial)}/screenshot?t=${Date.now()}`;
  const response = await fetch(url, { credentials: "include" });

  if (!response.ok) {
    let message = "截屏失败";

    try {
      const payload = await response.json();
      message = payload.message ?? payload.error ?? message;
    } catch {
      // ignore
    }

    throw new Error(message);
  }

  const blob = await response.blob();
  const safeName = String(displayName).replace(/[^\w\u4e00-\u9fff.-]+/g, "_");
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = `${safeName}-${Date.now()}.png`;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
