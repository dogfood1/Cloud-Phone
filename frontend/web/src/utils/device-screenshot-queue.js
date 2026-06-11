const MAX_CONCURRENT = 4;
let active = 0;
/** @type {Array<() => void>} */
const waiters = [];

function pumpQueue() {
  while (active < MAX_CONCURRENT && waiters.length) {
    const run = waiters.shift();
    active += 1;

    void Promise.resolve()
      .then(run)
      .finally(() => {
        active -= 1;
        pumpQueue();
      });
  }
}

/**
 * Limit concurrent device screenshot fetches so large galleries stay responsive.
 * @template T
 * @param {() => Promise<T>} task
 * @returns {Promise<T>}
 */
export function runScreenshotTask(task) {
  return new Promise((resolve, reject) => {
    waiters.push(() =>
      task()
        .then(resolve)
        .catch(reject),
    );
    pumpQueue();
  });
}
