const MAX_PARALLEL_STARTS = 2;
let activeStarts = 0;
/** @type {Array<() => void>} */
const waitQueue = [];

function drainStartQueue() {
  while (activeStarts < MAX_PARALLEL_STARTS && waitQueue.length > 0) {
    activeStarts += 1;
    waitQueue.shift()?.();
  }
}

function releaseStartSlot() {
  activeStarts = Math.max(0, activeStarts - 1);
  drainStartQueue();
}

/** Limit concurrent cast/start calls to reduce adb/shell startup races. */
export function acquireGroupCastStartSlot() {
  return new Promise((resolve) => {
    const grant = () => {
      resolve(releaseStartSlot);
    };

    if (activeStarts < MAX_PARALLEL_STARTS) {
      activeStarts += 1;
      resolve(releaseStartSlot);
      return;
    }

    waitQueue.push(grant);
  });
}
