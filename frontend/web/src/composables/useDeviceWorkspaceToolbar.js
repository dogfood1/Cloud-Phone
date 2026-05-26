import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { DEVICE_WORKSPACE_ACTIONS } from "../utils/device-workspace-actions.js";
import { downloadDeviceScreenshot } from "../utils/device-screenshot-download.js";
import { getErrorMessage } from "../utils/api.js";
import { readExposedBoolean } from "../utils/read-exposed-ref.js";

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

  function isActionDisabled(action) {
    if (action.kind === "screenshot") {
      return !device.connected || screenshotBusy.value;
    }

    if (action.kind === "planned") {
      return true;
    }

    if (action.kind === "cast-navigation") {
      return !isCasting.value;
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

    viewport?.sendNavigation?.(actionId);
  }

  function onToolbarPointerDown(action, event) {
    if (!usesPressHold(action) || isActionDisabled(action)) {
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
    actionTitle,
    isActionDisabled,
    usesPressHold,
    onToolbarPointerDown,
    onToolbarPointerUp,
    handleToolbarClick,
  };
}
