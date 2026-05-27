import { getErrorMessage } from "../../utils/api.js";
import { nextPreviewRotationDeg, normalizeRotationDeg } from "../../utils/canvas-rotation.js";
import { downloadDeviceScreenshot } from "../../utils/device-screenshot-download.js";
import { readExposedBoolean } from "../../utils/read-exposed-ref.js";

export function createToolbarActionHandlers({
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
  isCastViewportRecording,
  closeVolumeMenu,
}) {
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

  function handleToolbarClick(action, event, { usesPressHold, isActionDisabled, toggleVolumeMenu }) {
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
    finalizeRecordingOnCastEnd,
    handleRecordToggle,
    handleScreenshot,
    handleInstantNavigation,
    handleVolumeSubAction,
    handlePreviewRotate,
    handleToolbarClick,
  };
}
