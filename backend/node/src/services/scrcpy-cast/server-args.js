import { SCRCPY_SERVER_VERSION } from "../../config/scrcpy-paths.js";

const REMOTE_JAR_PATH = "/data/local/tmp/scrcpy-server.jar";

export function getRemoteJarPath() {
  return REMOTE_JAR_PATH;
}

export function buildSocketName(scid) {
  return `scrcpy_${scid.toString(16).padStart(8, "0")}`;
}

export function buildServerShellCommand(scid, options = {}) {
  const maxSize = options.maxSize ?? 1024;
  const videoCodec = options.videoCodec ?? "h264";

  const params = [
    `CLASSPATH=${REMOTE_JAR_PATH}`,
    "app_process",
    "/",
    "com.genymobile.scrcpy.Server",
    SCRCPY_SERVER_VERSION,
    `scid=${scid.toString(16)}`,
    "tunnel_forward=true",
    "audio=false",
    "control=false",
    "video=true",
    "cleanup=false",
    "raw_stream=true",
    `max_size=${maxSize}`,
    `video_codec=${videoCodec}`,
    "send_dummy_byte=false",
    "send_device_meta=false",
    "send_frame_meta=false",
    "send_stream_meta=false",
  ];

  return params.join(" ");
}

export function pickScid() {
  return Math.floor(Math.random() * 0x7fffffff) + 1;
}

export function pickLocalPort() {
  return 27_000 + Math.floor(Math.random() * 1000);
}
