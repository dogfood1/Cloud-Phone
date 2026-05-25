export async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: options.body ? { "Content-Type": "application/json" } : {},
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const result = await response.json();

  if (!response.ok || result.success === false) {
    throw new Error(result.message ?? "Request failed.");
  }

  return result;
}

export function getErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}
