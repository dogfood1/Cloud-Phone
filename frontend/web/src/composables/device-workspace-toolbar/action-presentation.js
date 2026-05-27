import { formatRecordingDuration } from "../../utils/cast-recording-utils.js";
import { readExposedBoolean, readExposedNumber } from "../../utils/read-exposed-ref.js";

export function createToolbarActionPresentation({
  device,
  isCasting,
  castViewportRef,
  castOptions,
  recordingLabelTick,
  screenshotBusy,
  recordBusy,
}) {
  const screenOffActionLabel = (screenOn) => {
    if (!isCasting.value) {
      return "关闭屏幕";
    }

    return screenOn ? "关闭屏幕" : "点亮屏幕";
  };

  function isCastViewportRecording() {
    return readExposedBoolean(castViewportRef.value?.isRecording, false);
  }

  function isWebCastSession() {
    return isCasting.value;
  }

  function actionLabel(action) {
    if (action.id === "screen-off") {
      const screenOn = readExposedBoolean(castViewportRef.value?.displayScreenOn);
      return screenOffActionLabel(screenOn);
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

  function isActionDisabled(action) {
    if (action.kind === "screenshot") {
      return !device.connected || screenshotBusy.value;
    }

    if (action.kind === "apps" || action.kind === "files" || action.kind === "terminal") {
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

  return {
    isCastViewportRecording,
    actionLabel,
    actionIcon,
    isActionRecording,
    isActionDisabled,
    actionTitle,
  };
}
