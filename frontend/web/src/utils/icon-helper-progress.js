/**
 * @param {Record<string, unknown> | null | undefined} next
 * @param {{ phase: string, total: number, done: number, current: string, message: string }} current
 */
export function mergeIconHelperProgress(next, current) {
  if (!next || typeof next !== "object") {
    return current;
  }
  return {
    phase: String(next.phase || "running"),
    total: Number(next.total) || 0,
    done: Number(next.done) || 0,
    current: String(next.current || ""),
    message: String(next.message || ""),
  };
}

/**
 * @param {(path: string) => Promise<any>} request
 * @param {string} serial
 * @param {{
 *   getProgress: () => { phase: string, total: number, done: number, current: string, message: string },
 *   setProgress: (value: object) => void,
 *   updateUi?: boolean,
 *   timeoutMs?: number,
 * }} options
 */
export async function pollIconHelperUntilDone(request, serial, options) {
  const updateUi = options.updateUi !== false;
  const timeoutMs = options.timeoutMs ?? 10 * 60_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await request(
      `/api/devices/${encodeURIComponent(serial)}/icon-helper/progress`,
    );
    const next = result.progress || {};
    if (updateUi) {
      options.setProgress(mergeIconHelperProgress(next, options.getProgress()));
    } else {
      const current = options.getProgress();
      options.setProgress({
        ...current,
        phase: String(next.phase || current.phase || "running"),
        total: Number(next.total) || current.total,
        done: Number(next.done) || current.done,
      });
    }

    const phase = options.getProgress().phase;
    if (phase === "done" || phase === "error") {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  options.setProgress({
    ...options.getProgress(),
    phase: "error",
    message: "timeout",
  });
}
