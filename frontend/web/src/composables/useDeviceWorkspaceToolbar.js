import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { DEVICE_WORKSPACE_ACTIONS } from "../utils/device-workspace-actions.js";
import { downloadDeviceScreenshot } from "../utils/device-screenshot-download.js";
import { getErrorMessage } from "../utils/api.js";
import { readExposedBoolean } from "../utils/read-exposed-ref.js";
import { nextPreviewRotationDeg, normalizeRotationDeg } from "../utils/canvas-rotation.js";

function resolvePressActionId(actionId, shiftKey) {
  if (actionId === "volume") {
    return shiftKey ? "volume-down" : "volume-up";
  }

  return actionId;
}

export function useDeviceWorkspaceToolbar({
  device,
  isCasting,
  castViewportRef,
  castOptions,
  mirrorSettingsRef,
  onHint,
}) {
  const screenshotBusy = ref(false);
  /** @type {Map<number, string>} pointerId -> resolved press action (volume-up, home, …) */
  const activePresses = ref(new Map());

  const actions = DEVICE_WORKSPACE_ACTIONS;

  const screenOffActionLabel = computed(() => {
    if (!isCasting.value) {
      return "关闭屏幕";
    }

    const screenOn = readExposedBoolean(castViewportRef.value?.displayScreenOn);
    return screenOn ? "关闭屏幕" : "点亮屏幕";
  });

  function actionLabel(action) {
    if (action.id === "screen-off") {
      return screenOffActionLabel.value;
    }

    return action.label;
  }

  function actionIcon(action) {
    if (action.id === "screen-off") {
      const screenOn = readExposedBoolean(castViewportRef.value?.displayScreenOn);
      return screenOn ? "screen-off" : "screen-on";
    }

    return action.icon;
  }

  function isActionDisabled(action) {
    if (action.kind === "screenshot") {
      return !device.connected || screenshotBusy.value;
    }

    if (action.kind === "planned") {
      return true;
    }

    if (action.kind === "cast-navigation") {
      if (!isCasting.value) {
        return true;
      }

      if (action.id === "rotate") {
        return castOptions?.value?.mirror?.video?.disabled === true;
      }

      return false;
    }

    return true;
  }

  function actionTitle(action) {
    if (action.kind === "planned") {
      return "即将推出";
    }

    return action.title ?? "";
  }

  function usesPressHold(action) {
    return action.kind === "cast-navigation" && action.pressHold === true;
  }

  function isActionPressed(action) {
    if (!usesPressHold(action)) {
      return false;
    }

    for (const pressActionId of activePresses.value.values()) {
      if (action.id === "volume") {
        if (pressActionId === "volume-up" || pressActionId === "volume-down") {
          return true;
        }
        continue;
      }

      if (pressActionId === action.id) {
        return true;
      }
    }

    return false;
  }

  function sendPressPhase(pressActionId, phase) {
    castViewportRef.value?.sendNavigationPress?.(pressActionId, phase);
  }

  function releasePointerPress(pointerId) {
    const pressActionId = activePresses.value.get(pointerId);

    if (!pressActionId) {
      return;
    }

    activePresses.value.delete(pointerId);
    sendPressPhase(pressActionId, "up");
  }

  function releaseAllPresses() {
    for (const pointerId of [...activePresses.value.keys()]) {
      releasePointerPress(pointerId);
    }
  }

  function onWindowPointerUp(event) {
    releasePointerPress(event.pointerId);
  }

  function onWindowBlur() {
    releaseAllPresses();
  }

  watch(isCasting, (casting) => {
    if (!casting) {
      releaseAllPresses();
    }
  });

  onMounted(() => {
    window.addEventListener("pointerup", onWindowPointerUp);
    window.addEventListener("blur", onWindowBlur);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("pointerup", onWindowPointerUp);
    window.removeEventListener("blur", onWindowBlur);
    releaseAllPresses();
  });

  async function handleScreenshot() {
    if (!device.connected || screenshotBusy.value) {
      return;
    }

    screenshotBusy.value = true;
    onHint?.("");

    try {
      await downloadDeviceScreenshot(device.serial, device.displayName);
    } catch (error) {
      onHint?.(getErrorMessage(error, "截屏失败"));
    } finally {
      screenshotBusy.value = false;
    }
  }

  function handleInstantNavigation(actionId) {
    if (!isCasting.value) {
      return;
    }

    const viewport = castViewportRef.value;

    if (actionId === "screen-off") {
      const screenOn = readExposedBoolean(viewport?.displayScreenOn);
      viewport?.sendNavigation?.(screenOn ? "screen-off" : "screen-on");
      return;
    }

    if (actionId === "rotate") {
      handlePreviewRotate();
      return;
    }

    viewport?.sendNavigation?.(actionId);
  }

  function handlePreviewRotate() {
    const settingsVideo = mirrorSettingsRef?.value?.stepPreviewRotationDeg?.();

    let rotationDeg;

    if (settingsVideo !== undefined) {
      rotationDeg = settingsVideo;
    } else {
      const mirror = castOptions?.value?.mirror;

      if (!mirror?.video || mirror.video.disabled) {
        return;
      }

      rotationDeg = nextPreviewRotationDeg(mirror.video.rotationDeg);
      mirror.video.rotationDeg = rotationDeg;
    }

    rotationDeg = normalizeRotationDeg(rotationDeg);

    if (castOptions?.value?.mirror?.video) {
      castOptions.value.mirror.video.rotationDeg = rotationDeg;
    }

    castViewportRef.value?.applyPreviewRotation?.(rotationDeg);
  }

  function onToolbarPointerDown(action, event) {
    if (
      !usesPressHold(action) ||
      isActionDisabled(action) ||
      event.button !== 0 ||
      event.isPrimary === false
    ) {
      return;
    }

    event.preventDefault();

    const target = event.currentTarget;

    if (target instanceof Element && "setPointerCapture" in target) {
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        // ignore
      }
    }

    if (activePresses.value.has(event.pointerId)) {
      return;
    }

    const pressActionId = resolvePressActionId(action.id, event.shiftKey === true);
    activePresses.value.set(event.pointerId, pressActionId);
    sendPressPhase(pressActionId, "down");
  }

  function onToolbarPointerUp(action, event) {
    if (!usesPressHold(action)) {
      return;
    }

    if (event.type === "pointerup" && event.button !== 0) {
      return;
    }

    releasePointerPress(event.pointerId);

    const target = event.currentTarget;

    if (target instanceof Element && "releasePointerCapture" in target) {
      try {
        if (target.hasPointerCapture?.(event.pointerId)) {
          target.releasePointerCapture(event.pointerId);
        }
      } catch {
        // ignore
      }
    }
  }

  function handleToolbarClick(action, event) {
    if (usesPressHold(action)) {
      event.preventDefault();
      return;
    }

    if (isActionDisabled(action)) {
      return;
    }

    if (action.kind === "screenshot") {
      void handleScreenshot();
      return;
    }

    if (action.kind === "cast-navigation") {
      handleInstantNavigation(action.id);
    }
  }

  return {
    actions,
    screenshotBusy,
    actionLabel,
    actionIcon,
    actionTitle,
    isActionDisabled,
    usesPressHold,
    isActionPressed,
    onToolbarPointerDown,
    onToolbarPointerUp,
    handleToolbarClick,
  };
}
