const GLOBAL_LOCK_KEY = "__global__";
/** @type {Map<string, Promise<void>>} */
const adbQueues = new Map();

function normalizeLockKey(lockKey) {
  if (typeof lockKey !== "string" || !lockKey.trim()) {
    return GLOBAL_LOCK_KEY;
  }
  return lockKey.trim();
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

  run.finally(() => {
    if (adbQueues.get(lockKey) === nextQueue) {
      adbQueues.delete(lockKey);
    }
  });

  return run;
}
