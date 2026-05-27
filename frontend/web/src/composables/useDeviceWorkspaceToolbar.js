import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import {
  DEVICE_WORKSPACE_ACTIONS,
  VOLUME_SUB_ACTIONS,
} from "../utils/device-workspace-actions.js";
import { downloadDeviceScreenshot } from "../utils/device-screenshot-download.js";
import { formatRecordingDuration } from "../utils/cast-recording-utils.js";
import { getErrorMessage } from "../utils/api.js";
import { readExposedBoolean, readExposedNumber } from "../utils/read-exposed-ref.js";
import { nextPreviewRotationDeg, normalizeRotationDeg } from "../utils/canvas-rotation.js";

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
  /** @type {Map<number, string>} pointerId -> resolved press action */
  const activePresses = ref(new Map());

  const actions = DEVICE_WORKSPACE_ACTIONS;
  const volumeSubActions = VOLUME_SUB_ACTIONS;

  const screenOffActionLabel = computed(() => {
    if (!isCasting.value) {
      return "关闭屏幕";
    }

    const screenOn = readExposedBoolean(castViewportRef.value?.displayScreenOn);
    return screenOn ? "关闭屏幕" : "点亮屏幕";
  });

  function isVolumeMenuAction(action) {
    return action.kind === "volume-menu";
  }

  function closeVolumeMenu() {
    volumeMenuOpen.value = false;
  }

  function toggleVolumeMenu() {
    volumeMenuOpen.value = !volumeMenuOpen.value;
  }

  function isCastViewportRecording() {
    return readExposedBoolean(castViewportRef.value?.isRecording, false);
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
      if (isCastViewportRecording()) {
        recordingLabelTick.value += 1;
      }
    }, 250);
  }

  function actionLabel(action) {
    if (action.id === "screen-off") {
      return screenOffActionLabel.value;
    }

    if (action.id === "record" && isCastViewportRecording()) {
      void recordingLabelTick.value;
      const elapsed = readExposedNumber(castViewportRef.value?.recordingElapsedMs, 0);
      return `录制中 ${formatRecordingDuration(elapsed)}`;
    }

    return action.label;
  }

  function actionIcon(action) {
    if (action.id === "screen-off") {
      const screenOn = readExposedBoolean(castViewportRef.value?.displayScreenOn);
      return screenOn ? "screen-off" : "screen-on";
    }

    if (action.id === "record" && isCastViewportRecording()) {
      return "record-active";
    }

    return action.icon;
  }

  function isActionRecording(action) {
    return action.id === "record" && isCastViewportRecording();
  }

  function isWebCastSession() {
    return isCasting.value;
  }

  function isActionDisabled(action) {
    if (action.kind === "screenshot") {
      return !device.connected || screenshotBusy.value;
    }

    if (action.kind === "apps") {
      return !device.connected;
    }

    if (action.kind === "files") {
      return !device.connected;
    }

    if (action.kind === "terminal") {
      return !device.connected;
    }

    if (action.kind === "volume-menu") {
      return !isWebCastSession();
    }

    if (action.kind === "record") {
      if (!isWebCastSession() || recordBusy.value) {
        return true;
      }

      const supported = castViewportRef.value?.isCastRecordingSupported?.(castOptions?.value);

      if (supported === false) {
        return true;
      }

      return false;
    }

    if (action.kind === "cast-navigation") {
      if (!isWebCastSession()) {
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
    if (action.kind === "apps") {
      if (!device.connected) {
        return "设备未在线";
      }

      return action.title ?? "管理已安装应用";
    }

    if (action.kind === "files") {
      if (!device.connected) {
        return "设备未在线";
      }

      return action.title ?? "浏览设备文件";
    }

    if (action.kind === "terminal") {
      if (!device.connected) {
        return "设备未在线";
      }

      return action.title ?? "打开 ADB Shell 终端";
    }

    if (action.kind === "record") {
      if (!isCasting.value) {
        return "请先开始投屏";
      }

      if (castViewportRef.value?.isCastRecordingSupported?.(castOptions?.value) === false) {
        return castOptions?.value?.mirror?.video?.disabled === true
          ? "当前浏览器不支持 MP3 录制"
          : "当前浏览器不支持 MP4 录屏";
      }

      if (isCastViewportRecording()) {
        const ext = castOptions?.value?.mirror?.video?.disabled === true ? "MP3" : "MP4";
        return `点击结束录制并保存为 ${ext}`;
      }

      if (castOptions?.value?.mirror?.video?.disabled === true) {
        return "开始录制设备音频（保存为 MP3）";
      }

      return action.title ?? "开始录制投屏画面（保存为 MP4）";
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

  async function finalizeRecordingOnCastEnd() {
    const viewport = castViewportRef.value;

    if (!viewport?.stopCastRecording || !isCastViewportRecording()) {
      return;
    }

    recordBusy.value = true;

    try {
      await viewport.stopCastRecording(true);
      const ext = castOptions?.value?.mirror?.video?.disabled === true ? "MP3" : "MP4";
      onHint?.(`投屏已结束，${ext} 已保存`);
    } catch (error) {
      onHint?.(getErrorMessage(error, "保存录屏失败"));
    } finally {
      recordBusy.value = false;
    }
  }

  watch(isCasting, (casting) => {
    if (casting) {
      startRecordingLabelTimer();
      return;
    }

    stopRecordingLabelTimer();
    releaseAllPresses();
    closeVolumeMenu();
    void finalizeRecordingOnCastEnd();
  });

  onMounted(() => {
    window.addEventListener("pointerup", onWindowPointerUp);
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("pointerdown", onDocumentPointerDown, true);
  });

  onBeforeUnmount(() => {
    stopRecordingLabelTimer();
    window.removeEventListener("pointerup", onWindowPointerUp);
    window.removeEventListener("blur", onWindowBlur);
    document.removeEventListener("pointerdown", onDocumentPointerDown, true);
    releaseAllPresses();
    closeVolumeMenu();
  });

  async function handleRecordToggle() {
    const viewport = castViewportRef.value;

    if (!viewport?.toggleCastRecording) {
      onHint?.("录屏组件未就绪");
      return;
    }

    const wasRecording = isCastViewportRecording();
    recordBusy.value = true;

    try {
      await viewport.toggleCastRecording(device.displayName ?? device.serial);
      const isAudioOnly = castOptions?.value?.mirror?.video?.disabled === true;

      onHint?.(
        wasRecording
          ? isAudioOnly
            ? "MP3 已保存"
            : "MP4 已保存"
          : isAudioOnly
            ? "开始录制音频（MP3）"
            : "开始录制画面（MP4）",
      );
    } catch (error) {
      onHint?.(getErrorMessage(error, "录屏失败"));
    } finally {
      recordBusy.value = false;
    }
  }

  async function handleScreenshot() {
    if (!device.connected || screenshotBusy.value) {
      return;
    }

    screenshotBusy.value = true;
    onHint?.("");
    castViewportRef.value?.playScreenshotFlash?.();

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

  function handleVolumeSubAction(subAction) {
    if (!isCasting.value) {
      return;
    }

    castViewportRef.value?.sendNavigation?.(subAction.id);
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

    activePresses.value.set(event.pointerId, action.id);
    sendPressPhase(action.id, "down");
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

    if (action.kind === "files") {
      onOpenFiles?.();
      return;
    }

    if (action.kind === "apps") {
      onOpenApps?.();
      return;
    }

    if (action.kind === "terminal") {
      onOpenTerminal?.();
      return;
    }

    if (action.kind === "record") {
      void handleRecordToggle();
      return;
    }

    if (action.kind === "volume-menu") {
      toggleVolumeMenu();
      return;
    }

    if (action.kind === "cast-navigation") {
      handleInstantNavigation(action.id);
    }
  }

  return {
    actions,
    volumeSubActions,
    volumeMenuOpen,
    screenshotBusy,
    recordBusy,
    isVolumeMenuAction,
    actionLabel,
    actionIcon,
    isActionRecording,
    actionTitle,
    isActionDisabled,
    usesPressHold,
    isActionPressed,
    onToolbarPointerDown,
    onToolbarPointerUp,
    handleToolbarClick,
    handleVolumeSubAction,
  };
}
