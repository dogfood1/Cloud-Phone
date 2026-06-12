import { computed, ref, unref } from "vue";

import { useDeviceScrcpyCast } from "./useDeviceScrcpyCast.js";
import { useHarmonyCast } from "./useHarmonyCast.js";

function isHarmonyCastDevice(deviceRef, payload) {
  if (payload?.castProtocol === "harmony-jpeg" || payload?.platform === "harmony") {
    return true;
  }

  return unref(deviceRef)?.platform === "harmony";
}

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
  /** @type {import("vue").Ref<"harmony" | "scrcpy" | null>} */
  const activeCastMode = ref(null);

  const scrcpyCast = useDeviceScrcpyCast(
    serialRef,
    canvasRef,
    castOptionsRef,
    rotatorRef,
    viewportRef,
    {
      ...castHooks,
      isCastActive: () =>
        activeCastMode.value === "scrcpy" ||
        (activeCastMode.value === null && !isHarmony.value),
    },
  );

  const harmonyCast = useHarmonyCast(serialRef, canvasRef, castOptionsRef, viewportRef, {
    ...castHooks,
    isCastActive: () =>
      activeCastMode.value === "harmony" ||
      (activeCastMode.value === null && isHarmony.value),
  });

  function pickCast(payload) {
    return isHarmonyCastDevice(deviceRef, payload) ? harmonyCast : scrcpyCast;
  }

  function pickActiveCast() {
    if (activeCastMode.value === "harmony") {
      return harmonyCast;
    }

    if (activeCastMode.value === "scrcpy") {
      return scrcpyCast;
    }

    return isHarmony.value ? harmonyCast : scrcpyCast;
  }

  return new Proxy(
    {},
    {
      get(_target, property) {
        if (property === "beginCast") {
          return (payload) => {
            activeCastMode.value = isHarmonyCastDevice(deviceRef, payload) ? "harmony" : "scrcpy";
            return pickCast(payload).beginCast(payload);
          };
        }

        if (property === "stopCast") {
          return (options) => {
            const result = pickActiveCast().stopCast(options);

            if (options?.backend !== false) {
              activeCastMode.value = null;
            }

            return result;
          };
        }

        if (property === "activeCastMode") {
          return activeCastMode;
        }

        const active = pickActiveCast();
        const value = active[property];

        if (typeof value === "function") {
          return value.bind(active);
        }

        return value;
      },
    },
  );
}
