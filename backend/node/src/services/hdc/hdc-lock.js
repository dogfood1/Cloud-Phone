const GLOBAL_LOCK_KEY = "__global__";
/** @type {Map<string, Promise<void>>} */
const hdcQueues = new Map();

function normalizeLockKey(lockKey) {
  if (typeof lockKey !== "string" || !lockKey.trim()) {
    return GLOBAL_LOCK_KEY;
  }

  return lockKey.trim();
}

function releaseQueueSlot(lockKey, nextQueue) {
  if (hdcQueues.get(lockKey) === nextQueue) {
    hdcQueues.delete(lockKey);
  }
}

/**
 * Serialize hdc tasks by lock key.
 * @template T
 * @param {() => Promise<T> | T} task
 * @param {{ lockKey?: string }} [options]
 * @returns {Promise<T>}
 */
export function runWithHdcLock(task, options = {}) {
  const lockKey = normalizeLockKey(options.lockKey);
  const queue = hdcQueues.get(lockKey) ?? Promise.resolve();
  const run = queue.then(() => task());
  const nextQueue = run.then(
    () => undefined,
    () => undefined,
  );

  hdcQueues.set(lockKey, nextQueue);

  void run.finally(() => {
    releaseQueueSlot(lockKey, nextQueue);
  }).catch(() => {});

  return run;
}
