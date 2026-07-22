/**
 * Parse device WebSocket text payload for cast_error notifications.
 * @param {string} raw
 * @returns {{ type: string, code: string, message: string } | null}
 */
export function parseCastErrorMessage(raw) {
  const text = String(raw || "").trim();
  if (!text.startsWith("{")) {
    return null;
  }

  try {
    const data = JSON.parse(text);
    if (data?.type !== "cast_error") {
      return null;
    }
    return {
      type: "cast_error",
      code: String(data.code || "cast_error"),
      message: String(data.message || ""),
    };
  } catch {
    return null;
  }
}

/**
 * @param {string} text
 */
export function isVirtualDisplayError(text) {
  const lower = String(text || "").toLowerCase();
  return (
    lower.includes("virtual_display")
    || lower.includes("add_trusted_display")
    || lower.includes("could not create display")
    || lower.includes("could not create virtual display")
    || lower.includes("trusted virtual display")
  );
}

/**
 * User-facing copy for virtual-display permission failures (Android 15 OEM).
 * @param {string} detail
 */
export function formatVirtualDisplayUserMessage(detail = "") {
  const base =
    "当前设备系统不允许创建虚拟显示（常见于 Android 15 / 部分华为等机型缺少 ADD_TRUSTED_DISPLAY 权限）。"
    + "多应用独立窗口依赖虚拟屏，因此无法在此设备上使用。";
  const trimmed = String(detail || "").trim();
  if (!trimmed) {
    return base;
  }
  return `${base}\n\n技术详情：${trimmed}`;
}
