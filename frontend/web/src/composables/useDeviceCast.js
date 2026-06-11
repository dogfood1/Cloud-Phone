import { computed, unref } from "vue";

import { useDeviceScrcpyCast } from "./useDeviceScrcpyCast.js";
import { useHarmonyCast } from "./useHarmonyCast.js";

export function useDeviceCast(
  deviceRef,
  canvasRef,
  castOptionsRef,
  rotatorRef,
  viewportRef,
  castHooks = {},
) {
  const serialRef = computed(() => unref(deviceRef)?.serial ?? "");
  const isHarmony = computed(() => unref(deviceRef)?.platform === "harmony");

  const scrcpyCast = useDeviceScrcpyCast(
    serialRef,
    canvasRef,
    castOptionsRef,
    rotatorRef,
    viewportRef,
    castHooks,
  );

  const harmonyCast = useHarmonyCast(serialRef, canvasRef, castOptionsRef, viewportRef, castHooks);

  return new Proxy(
    {},
    {
      get(_target, property) {
        const active = isHarmony.value ? harmonyCast : scrcpyCast;
        const value = active[property];

        if (typeof value === "function") {
          return value.bind(active);
        }

        return value;
      },
    },
  );
}
