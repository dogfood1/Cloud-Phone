import { computed, ref, unref } from "vue";

import { useDeviceScrcpyCast } from "./useDeviceScrcpyCast.js";
import { useHarmonyCast } from "./useHarmonyCast.js";
import { useIosCast } from "./useIosCast.js";

function resolveCastKind(deviceRef, payload) {
  if (payload?.castProtocol === "ios-mjpeg" || payload?.platform === "ios") {
    return "ios";
  }

  if (payload?.castProtocol === "harmony-jpeg" || payload?.platform === "harmony") {
    return "harmony";
  }

  const platform = unref(deviceRef)?.platform;

  if (platform === "ios") {
    return "ios";
  }

  if (platform === "harmony") {
    return "harmony";
  }

  return "scrcpy";
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
  const platform = computed(() => unref(deviceRef)?.platform ?? "android");
  /** @type {import("vue").Ref<"harmony" | "ios" | "scrcpy" | null>} */
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
        (activeCastMode.value === null && platform.value === "android"),
    },
  );

  const harmonyCast = useHarmonyCast(serialRef, canvasRef, castOptionsRef, rotatorRef, viewportRef, {
    ...castHooks,
    getDevice: () => unref(deviceRef),
    isCastActive: () =>
      activeCastMode.value === "harmony" ||
      (activeCastMode.value === null && platform.value === "harmony"),
  });

  const iosCast = useIosCast(serialRef, canvasRef, castOptionsRef, rotatorRef, viewportRef, {
    ...castHooks,
    getDevice: () => unref(deviceRef),
    isCastActive: () =>
      activeCastMode.value === "ios" ||
      (activeCastMode.value === null && platform.value === "ios"),
  });

  function pickCast(payload) {
    const kind = resolveCastKind(deviceRef, payload);

    if (kind === "ios") {
      return iosCast;
    }

    if (kind === "harmony") {
      return harmonyCast;
    }

    return scrcpyCast;
  }

  function pickActiveCast() {
    if (activeCastMode.value === "ios") {
      return iosCast;
    }

    if (activeCastMode.value === "harmony") {
      return harmonyCast;
    }

    if (activeCastMode.value === "scrcpy") {
      return scrcpyCast;
    }

    if (platform.value === "ios") {
      return iosCast;
    }

    if (platform.value === "harmony") {
      return harmonyCast;
    }

    return scrcpyCast;
  }

  return new Proxy(
    {},
    {
      get(_target, property) {
        if (property === "beginCast") {
          return (payload) => {
            activeCastMode.value = resolveCastKind(deviceRef, payload);
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
