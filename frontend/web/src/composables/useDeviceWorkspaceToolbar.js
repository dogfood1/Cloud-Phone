import { onBeforeUnmount, onMounted, ref, watch } from "vue";

import {
  DEVICE_WORKSPACE_ACTIONS,
  VOLUME_SUB_ACTIONS,
} from "../utils/device-workspace-actions.js";
import { createToolbarActionHandlers } from "./device-workspace-toolbar/action-handlers.js";
import { createToolbarActionPresentation } from "./device-workspace-toolbar/action-presentation.js";
import { createToolbarPressHold } from "./device-workspace-toolbar/press-hold.js";

export function useDeviceWorkspaceToolbar({
  device,
  isCasting,
  castViewportRef,
  castOptions,
  mirrorSettingsRef,
  onHint,
  onOpenFiles,
  onOpenApps,
  onOpenTerminal,
}) {
  const screenshotBusy = ref(false);
  const recordBusy = ref(false);
  /** Bumps while casting so recording duration label re-renders. */
  const recordingLabelTick = ref(0);
  const volumeMenuOpen = ref(false);
  let recordingLabelTimer = null;

  const actions = DEVICE_WORKSPACE_ACTIONS;
  const volumeSubActions = VOLUME_SUB_ACTIONS;

  const presentation = createToolbarActionPresentation({
    device,
    isCasting,
    castViewportRef,
    castOptions,
    recordingLabelTick,
    screenshotBusy,
    recordBusy,
  });

  const pressHold = createToolbarPressHold({ castViewportRef });

  function isVolumeMenuAction(action) {
    return action.kind === "volume-menu";
  }

  function closeVolumeMenu() {
    volumeMenuOpen.value = false;
  }

  function toggleVolumeMenu() {
    volumeMenuOpen.value = !volumeMenuOpen.value;
  }

  function stopRecordingLabelTimer() {
    if (recordingLabelTimer) {
      window.clearInterval(recordingLabelTimer);
      recordingLabelTimer = null;
    }
  }

  function startRecordingLabelTimer() {
    stopRecordingLabelTimer();
    recordingLabelTimer = window.setInterval(() => {
      if (presentation.isCastViewportRecording()) {
        recordingLabelTick.value += 1;
      }
    }, 250);
  }

  const handlers = createToolbarActionHandlers({
    device,
    isCasting,
    castViewportRef,
    castOptions,
    mirrorSettingsRef,
    onHint,
    onOpenFiles,
    onOpenApps,
    onOpenTerminal,
    screenshotBusy,
    recordBusy,
    isCastViewportRecording: presentation.isCastViewportRecording,
    closeVolumeMenu,
  });

  function onWindowBlur() {
    pressHold.releaseAllPresses();
    closeVolumeMenu();
  }

  function onDocumentPointerDown(event) {
    if (!volumeMenuOpen.value) {
      return;
    }

    const target = event.target;

    if (target instanceof Element && target.closest(".device-workspace__action-anchor--volume")) {
      return;
    }

    closeVolumeMenu();
  }

  watch(isCasting, (casting) => {
    if (casting) {
      startRecordingLabelTimer();
      return;
    }

    stopRecordingLabelTimer();
    pressHold.releaseAllPresses();
    closeVolumeMenu();
    void handlers.finalizeRecordingOnCastEnd();
  });

  onMounted(() => {
    window.addEventListener("pointerup", pressHold.onWindowPointerUp);
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("pointerdown", onDocumentPointerDown, true);
  });

  onBeforeUnmount(() => {
    stopRecordingLabelTimer();
    window.removeEventListener("pointerup", pressHold.onWindowPointerUp);
    window.removeEventListener("blur", onWindowBlur);
    document.removeEventListener("pointerdown", onDocumentPointerDown, true);
    pressHold.releaseAllPresses();
    closeVolumeMenu();
  });

  return {
    actions,
    volumeSubActions,
    volumeMenuOpen,
    screenshotBusy,
    recordBusy,
    isVolumeMenuAction,
    actionLabel: presentation.actionLabel,
    actionIcon: presentation.actionIcon,
    isActionRecording: presentation.isActionRecording,
    actionTitle: presentation.actionTitle,
    isActionDisabled: presentation.isActionDisabled,
    usesPressHold: pressHold.usesPressHold,
    isActionPressed: pressHold.isActionPressed,
    onToolbarPointerDown: (action, event) =>
      pressHold.onToolbarPointerDown(action, event, {
        isActionDisabled: presentation.isActionDisabled,
      }),
    onToolbarPointerUp: pressHold.onToolbarPointerUp,
    handleToolbarClick: (action, event) =>
      handlers.handleToolbarClick(action, event, {
        usesPressHold: pressHold.usesPressHold,
        isActionDisabled: presentation.isActionDisabled,
        toggleVolumeMenu,
      }),
    handleVolumeSubAction: handlers.handleVolumeSubAction,
  };
}
