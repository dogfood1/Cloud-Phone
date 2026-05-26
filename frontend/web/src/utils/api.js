export async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    method: options.method ?? "GET",
    credentials: "include",
    signal: options.signal,
    headers: options.body ? { "Content-Type": "application/json" } : {},
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let result = {};

  try {
    result = await response.json();
  } catch {
    throw new Error(
      response.ok
        ? "服务器返回了无效 JSON。"
        : `服务器错误 (${response.status})，请确认后端已启动且无崩溃。`,
    );
  }

  if (!response.ok || result.success === false) {
    throw new Error(result.message ?? result.error ?? "Request failed.");
  }

  return result;
}

export function getErrorMessage(error, fallback) {
  if (error instanceof TypeError) {
    return "无法连接后端 API，请先启动后端（根目录 npm run dev 或 npm run dev:backend）。";
  }

  return error instanceof Error ? error.message : fallback;
}
