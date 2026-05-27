export function createListDirectoryError(error, devicePath) {
  const detail = [error?.stderr, error?.stdout, error?.message].filter(Boolean).join("\n");
  const normalized = detail.trim();

  if (/permission denied|eacces|not permitted|access denied|权限/i.test(normalized)) {
    return new Error("权限不足，无法访问此目录");
  }

  if (/no such file|not found|no such file or directory/i.test(normalized)) {
    return new Error("目录不存在");
  }

  if (normalized) {
    return new Error(normalized);
  }

  return new Error(`无法读取目录：${devicePath}`);
}
