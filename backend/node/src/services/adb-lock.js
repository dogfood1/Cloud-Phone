let adbQueue = Promise.resolve();

export function runWithAdbLock(task) {
  const run = adbQueue.then(() => task());
  adbQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
