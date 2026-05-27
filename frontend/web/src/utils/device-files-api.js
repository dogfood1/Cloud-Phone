export async function fetchDeviceFiles(serial, displayPath = "/") {
  const params = new URLSearchParams({ path: displayPath });
  const url = `/api/devices/${encodeURIComponent(serial)}/files?${params}`;
  const response = await fetch(url, { credentials: "include" });

  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new Error("无法解析设备目录响应");
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? payload.error ?? "读取设备目录失败");
  }

  return payload;
}
