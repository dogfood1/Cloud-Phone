import { SCRCPY_SERVER_VERSION, SCRCPY_WEB_CAST_MODE } from "../../config/scrcpy-paths.js";
import { resolveCastServerOptions } from "./cast-options.js";

const REMOTE_JAR_PATH = "/data/local/tmp/scrcpy-server.jar";

export const DEFAULT_CAST_SCID = -1;
export const CAST_TUNNEL_FORWARD = "forward";

export function getRemoteJarPath() {
  return REMOTE_JAR_PATH;
}

export function buildSocketName(scid = DEFAULT_CAST_SCID) {
  if (scid === -1) {
    return "scrcpy";
  }

  return `scrcpy_${scid.toString(16).padStart(8, "0")}`;
}

export function buildServerShellCommand(scid = DEFAULT_CAST_SCID, options = {}) {
  const resolved = resolveCastServerOptions(options);
  // Cloud Phone scrcpy-server web mode expects:
  //   <clientVersion> web <logLevel> <port> <listenOnAllInterfaces>
  // It runs its own WebSocket server on device (default 8886), so no tunnel_forward sockets are used.
  if (SCRCPY_WEB_CAST_MODE) {
    // Keep the process running even if the adb shell session ends.
    // Mirrors ws-scrcpy server runner:
    //   CLASSPATH=... nohup app_process / com.genymobile.scrcpy.Server <ver> web <level> <port> <listenAll> 2>&1 > /dev/null
    return [
      `CLASSPATH=${REMOTE_JAR_PATH}`,
      "nohup",
      "app_process",
      "/",
      "com.genymobile.scrcpy.Server",
      SCRCPY_SERVER_VERSION,
      "web",
      "DEBUG",
      "8886",
      "true",
      "2>&1",
      ">",
      "/dev/null",
    ].join(" ");
  }

  const params = [
    `CLASSPATH=${REMOTE_JAR_PATH}`,
    "app_process",
    "/",
    "com.genymobile.scrcpy.Server",
    SCRCPY_SERVER_VERSION,
    "tunnel_forward=true",
    `video=${resolved.video !== false}`,
    `audio=${resolved.audio}`,
    `control=${resolved.control}`,
    "cleanup=false",
    `max_size=${resolved.maxSize}`,
    `video_codec=${resolved.videoCodec}`,
    `video_bit_rate=${resolved.videoBitRate}`,
    `max_fps=${resolved.maxFps}`,
    `show_touches=${resolved.showTouches}`,
    `stay_awake=${resolved.stayAwake}`,
    `turn_screen_off=${resolved.turnScreenOff}`,
    `power_on=${resolved.powerOn}`,
    "send_device_meta=false",
  ];

  if (resolved.audio) {
    params.push(`audio_source=${resolved.audioSource}`);
    params.push(`audio_bit_rate=${resolved.audioBitRate}`);
    params.push(`audio_codec=${resolved.audioCodec}`);

    if (resolved.audioDup) {
      params.push("audio_dup=true");
    }

    if (resolved.audioEncoder) {
      params.push(`audio_encoder=${resolved.audioEncoder}`);
    }
  }

  if (resolved.displayId !== undefined && !Number.isNaN(resolved.displayId)) {
    params.push(`display_id=${resolved.displayId}`);
  }

  if (scid !== -1) {
    params.splice(6, 0, `scid=${scid.toString(16)}`);
  }

  return params.join(" ");
}

export function pickLocalPort() {
  return 27_000 + Math.floor(Math.random() * 1000);
}
