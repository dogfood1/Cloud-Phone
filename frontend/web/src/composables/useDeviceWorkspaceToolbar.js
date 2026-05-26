import { computed, ref } from "vue";

import {
  CAST_NAVIGATION_ACTION_IDS,
  DEVICE_WORKSPACE_ACTIONS,
} from "../utils/device-workspace-actions.js";
import { downloadDeviceScreenshot } from "../utils/device-screenshot-download.js";
import { getErrorMessage } from "../utils/api.js";

function resolveCastNavigationAction(actionId, shiftKey) {
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

  const actions = DEVICE_WORKSPACE_ACTIONS;

  const screenOffActionLabel = computed(() => {
    if (!isCasting.value) {
      return "关闭屏幕";
    }

    const screenOn = castViewportRef.value?.displayScreenOn?.value ?? true;
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

  function handleCastNavigation(actionId, shiftKey = false) {
    if (!isCasting.value || !CAST_NAVIGATION_ACTION_IDS.has(actionId)) {
      return;
    }

    const viewport = castViewportRef.value;

    if (actionId === "screen-off") {
      const screenOn = viewport?.displayScreenOn?.value ?? true;
      viewport?.sendNavigation?.(screenOn ? "screen-off" : "screen-on");
      return;
    }

    const navigationAction = resolveCastNavigationAction(actionId, shiftKey);
    viewport?.sendNavigation?.(navigationAction);
  }

  function handleToolbarAction(actionId, event) {
    const action = actions.find((item) => item.id === actionId);

    if (!action || isActionDisabled(action)) {
      return;
    }

    if (action.kind === "screenshot") {
      void handleScreenshot();
      return;
    }

    if (action.kind === "cast-navigation") {
      handleCastNavigation(actionId, event?.shiftKey === true);
    }
  }

  return {
    actions,
    screenshotBusy,
    actionLabel,
    actionTitle,
    isActionDisabled,
    handleToolbarAction,
  };
}
