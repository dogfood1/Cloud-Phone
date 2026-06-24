/** Cloud Phone overlays on top of projects/scrcpy (official v4.0). */
export const UPSTREAM_DIR_SEGMENTS = ["projects", "scrcpy"];
export const TARGET_DIR_SEGMENTS = ["backend", "source", "scrcpy"];

export const SKIP_DIRS = new Set([".git", ".gradle", "build", "release"]);

/** Never overwrite from upstream; keep backend fork versions. */
export const PRESERVE_FILES = new Set([
  "CLOUD_PHONE.md",
  "server/build.gradle",
  "server/src/main/java/com/genymobile/scrcpy/Server.java",
  "server/src/main/java/com/genymobile/scrcpy/Options.java",
  "server/src/main/java/com/genymobile/scrcpy/OptionsParsing.java",
  "server/src/main/java/com/genymobile/scrcpy/OptionsValueParsers.java",
  "server/src/main/java/com/genymobile/scrcpy/OptionsWebExtras.java",
  "server/src/main/java/com/genymobile/scrcpy/control/Controller.java",
  "server/src/main/java/com/genymobile/scrcpy/control/ControlConnection.java",
  "server/src/main/java/com/genymobile/scrcpy/control/ControllerClipboard.java",
  "server/src/main/java/com/genymobile/scrcpy/control/ControllerDisplaySession.java",
  "server/src/main/java/com/genymobile/scrcpy/control/ControllerKeyboardInput.java",
  "server/src/main/java/com/genymobile/scrcpy/control/ControllerMessageHandler.java",
  "server/src/main/java/com/genymobile/scrcpy/control/ControllerTouchInput.java",
  "server/src/main/java/com/genymobile/scrcpy/control/ControlChannel.java",
  "server/src/main/java/com/genymobile/scrcpy/control/DeviceMessageSender.java",
  "server/src/main/java/com/genymobile/scrcpy/control/PositionMapper.java",
  "server/src/main/java/com/genymobile/scrcpy/device/Device.java",
  "server/src/main/java/com/genymobile/scrcpy/device/Streamer.java",
  "server/src/main/java/com/genymobile/scrcpy/display/DisplayInfo.java",
  "server/src/main/java/com/genymobile/scrcpy/video/CameraCapture.java",
  "server/src/main/java/com/genymobile/scrcpy/video/CameraCaptureSelection.java",
  "server/src/main/java/com/genymobile/scrcpy/video/SurfaceEncoder.java",
  "server/src/main/java/com/genymobile/scrcpy/video/VideoSink.java",
  "app/meson.build",
  "app/src/main.c",
]);

/** Directories owned by Cloud Phone; upstream has no equivalent. */
export const PRESERVE_PREFIXES = [
  "server/src/main/java/com/genymobile/scrcpy/ws/",
  "app/src/cloud_phone/",
];

export function shouldPreserve(relativePosixPath) {
  if (PRESERVE_FILES.has(relativePosixPath)) {
    return true;
  }

  return PRESERVE_PREFIXES.some((prefix) => relativePosixPath.startsWith(prefix));
}

export const WEBSOCKET_DEPENDENCY = "implementation 'org.java-websocket:Java-WebSocket:1.5.6'";
