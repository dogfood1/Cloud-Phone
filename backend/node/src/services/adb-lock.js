const GLOBAL_LOCK_KEY = "__global__";
/** @type {Map<string, Promise<void>>} */
const adbQueues = new Map();

function normalizeLockKey(lockKey) {
  if (typeof lockKey !== "string" || !lockKey.trim()) {
    return GLOBAL_LOCK_KEY;
  }
  return lockKey.trim();
}

function releaseQueueSlot(lockKey, nextQueue) {
  if (adbQueues.get(lockKey) === nextQueue) {
    adbQueues.delete(lockKey);
  }
}

/**
 * Serialize adb tasks by lock key.
 * Tasks with different keys can run in parallel.
 *
 * @template T
 * @param {() => Promise<T> | T} task
 * @param {{ lockKey?: string }} [options]
 * @returns {Promise<T>}
 */
export function runWithAdbLock(task, options = {}) {
  const lockKey = normalizeLockKey(options.lockKey);
  const queue = adbQueues.get(lockKey) ?? Promise.resolve();
  const run = queue.then(() => task());
  const nextQueue = run.then(
    () => undefined,
    () => undefined,
  );

  adbQueues.set(lockKey, nextQueue);

  // Must swallow cleanup promise rejections; otherwise failed adb tasks
  // surface as unhandledRejection even when callers catch `run`.
  void run.finally(() => {
    releaseQueueSlot(lockKey, nextQueue);
  }).catch(() => {});

  return run;
}
