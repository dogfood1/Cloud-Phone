/**
 * Mirror cast parameters aligned with projects/escrcpy preference models.
 * Web cast applies these via ws-scrcpy type 101 + codecOptions extras (not scrcpy.exe CLI).
 *
 * Reference: projects/escrcpy/desktop/src/models/preference/{video,device,audio,launch}/
 */

/** @typedef {'display' | 'web'} {'display'|'web'} transport */

export const MIRROR_TRANSPORT = {
  /** Desktop scrcpy.exe + adb tunnel */
  display: "display",
  /** Cloud-Phone: adb forward + device WebSocket server + browser proxy */
  web: "web",
};

/**
 * escrcpy CLI field → server Options key (web stream extras).
 * @type {Record<string, string>}
 */
export const ESCRCPY_SERVER_KEY_MAP = {
  "--max-size": "max_size",
  "--video-bit-rate": "video_bit_rate",
  "--max-fps": "max_fps",
  "--video-codec": "video_codec",
  "--video-encoder": "video_encoder",
  "--display-orientation": "capture_orientation",
  "--crop": "crop",
  "--display-id": "display_id",
  "--new-display": "new_display",
  "--show-touches": "show_touches",
  "--stay-awake": "stay_awake",
  "--keep-active": "keep_active",
  "--screen-off-timeout": "screen_off_timeout",
  "--power-on": "power_on",
  "--no-power-on": "power_on",
  "--flex-display": "flex_display",
  "--no-vd-destroy-content": "vd_destroy_content",
  "--no-vd-system-decorations": "vd_system_decorations",
  "--display-ime-policy": "display_ime_policy",
};

/** Re-export presets used by mirror UI (aligned with escrcpy launch presets). */
export {
  NEW_DISPLAY_PRESET_GROUPS,
  NEW_DISPLAY_PRESETS,
} from "../utils/mirror-screen-constants.js";
