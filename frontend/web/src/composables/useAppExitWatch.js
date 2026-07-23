import { onBeforeUnmount, watch } from "vue";

import { requestJson } from "../utils/api.js";

/**
 * Poll whether a package still has a visible activity; call onExit when it stops.
 * @param {{
 *   getSerial: () => string,
 *   getPackageName: () => string,
 *   enabled: () => boolean,
 *   onExit: () => void,
 *   intervalMs?: number,
 *   graceMs?: number,
 *   missLimit?: number,
 * }} options
 */
export function useAppExitWatch(options) {
  const intervalMs = options.intervalMs ?? 2500;
  const graceMs = options.graceMs ?? 12_000;
  const missLimit = options.missLimit ?? 4;

  let timer = null;
  let startedAt = 0;
  let pauseUntil = 0;
  let missCount = 0;
  let checking = false;

  function stop() {
    if (timer) {
      clearInterval(timer);
    }
    timer = null;
    missCount = 0;
    checking = false;
  }

  /** Pause exit detection (e.g. while resizing VD / reconnecting). */
  function bumpGrace(ms = graceMs) {
    const until = Date.now() + Math.max(0, Number(ms) || 0);
    pauseUntil = Math.max(pauseUntil, until);
    missCount = 0;
  }

  async function tick() {
    if (checking || !options.enabled()) {
      return;
    }
    const serial = options.getSerial();
    const packageName = options.getPackageName();
    if (!serial || !packageName) {
      return;
    }
    const now = Date.now();
    if (now - startedAt < graceMs || now < pauseUntil) {
      return;
    }

    checking = true;
    try {
      const result = await requestJson(
        `/api/devices/${encodeURIComponent(serial)}/apps/${encodeURIComponent(packageName)}/running`,
      );
      // Uncertain / failed checks must not close the window.
      if (result?.uncertain || result?.running == null) {
        return;
      }
      if (result?.running) {
        missCount = 0;
        return;
      }
      missCount += 1;
      if (missCount >= missLimit) {
        stop();
        options.onExit();
      }
    } catch {
      // Ignore transient ADB / network errors; do not close the window.
    } finally {
      checking = false;
    }
  }

  function start() {
    stop();
    startedAt = Date.now();
    pauseUntil = 0;
    missCount = 0;
    timer = setInterval(() => {
      void tick();
    }, intervalMs);
  }

  watch(
    () => options.enabled(),
    (enabled) => {
      if (enabled) {
        start();
      } else {
        stop();
      }
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    stop();
  });

  return { stop, start, bumpGrace };
}
