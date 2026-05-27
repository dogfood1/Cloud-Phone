export async function fetchDeviceApps(serial) {
  const url = `/api/devices/${encodeURIComponent(serial)}/apps`;
  const response = await fetch(url, { credentials: "include" });
  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new Error("无法解析应用列表响应");
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? payload.error ?? "读取应用列表失败");
  }

  return payload.apps ?? [];
}

export async function fetchDeviceAppDetail(serial, packageName) {
  const url = `/api/devices/${encodeURIComponent(serial)}/apps/${encodeURIComponent(packageName)}`;
  const response = await fetch(url, { credentials: "include" });
  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new Error("无法解析应用详情");
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? payload.error ?? "读取应用详情失败");
  }

  return payload.detail ?? null;
}

export async function uninstallDeviceApp(serial, packageName) {
  const url = `/api/devices/${encodeURIComponent(serial)}/apps/${encodeURIComponent(packageName)}?confirm=1`;
  const response = await fetch(url, { method: "DELETE", credentials: "include" });
  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new Error("无法解析卸载响应");
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? payload.error ?? "卸载失败");
  }

  return payload;
}

export async function setDeviceAppFrozen(serial, packageName, frozen) {
  const url = `/api/devices/${encodeURIComponent(serial)}/apps/${encodeURIComponent(packageName)}/state`;
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ frozen }),
  });
  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new Error("无法解析冻结状态响应");
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? payload.error ?? "操作失败");
  }

  return payload;
}

export async function downloadDeviceAppApk(serial, packageName, filenameHint) {
  const url = `/api/devices/${encodeURIComponent(serial)}/apps/${encodeURIComponent(packageName)}/apk`;
  const response = await fetch(url, { credentials: "include" });

  if (!response.ok) {
    let message = "导出 APK 失败";

    try {
      const err = await response.json();
      message = err.message ?? message;
    } catch {
      // ignore
    }

    throw new Error(message);
  }

  const blob = await response.blob();
  const name =
    filenameHint ||
    `${String(packageName).replace(/[^\w.-]+/g, "_")}.apk`;
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function installDeviceApk(serial, file) {
  const url = `/api/devices/${encodeURIComponent(serial)}/apps/install`;
  const response = await fetch(url, {
    method: "PUT",
    credentials: "include",
    body: file,
  });
  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new Error("无法解析安装响应");
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? payload.error ?? "安装失败");
  }

  return payload;
}
