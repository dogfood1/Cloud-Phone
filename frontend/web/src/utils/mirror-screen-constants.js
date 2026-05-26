/** escrcpy desktop/src/models/preference/launch/index.js — new-display presets */

export const NEW_DISPLAY_OFF = "";
export const NEW_DISPLAY_MAIN = "__main__";
export const NEW_DISPLAY_CUSTOM = "__custom__";

/** @type {{ label: string, options: { label: string, value: string, width?: number, height?: number, dpi?: number }[] }[]} */
export const NEW_DISPLAY_PRESET_GROUPS = [
  {
    label: "Desktop",
    options: [
      { label: "HD 16:9 1280×720/160", value: "1280x720/160", width: 1280, height: 720, dpi: 160 },
      { label: "FHD 16:9 1920×1080/160", value: "1920x1080/160", width: 1920, height: 1080, dpi: 160 },
      { label: "QHD 16:9 2560×1440/160", value: "2560x1440/160", width: 2560, height: 1440, dpi: 160 },
      { label: "4K UHD 16:9 3840×2160/160", value: "3840x2160/160", width: 3840, height: 2160, dpi: 160 },
      { label: "WXGA 16:10 1280×800/160", value: "1280x800/160", width: 1280, height: 800, dpi: 160 },
      { label: "WUXGA 16:10 1920×1200/160", value: "1920x1200/160", width: 1920, height: 1200, dpi: 160 },
    ],
  },
  {
    label: "Mac",
    options: [
      { label: "MacBook Pro 14\" 3024×1964/254", value: "3024x1964/254", width: 3024, height: 1964, dpi: 254 },
      { label: "MacBook Pro 16\" 3456×2234/254", value: "3456x2234/254", width: 3456, height: 2234, dpi: 254 },
      { label: "iMac 24\" 4480×2520/218", value: "4480x2520/218", width: 4480, height: 2520, dpi: 218 },
    ],
  },
  {
    label: "Ultrawide",
    options: [
      { label: "UW QHD 3440×1440/160", value: "3440x1440/160", width: 3440, height: 1440, dpi: 160 },
      { label: "UW 5K 5120×2160/160", value: "5120x2160/160", width: 5120, height: 2160, dpi: 160 },
    ],
  },
  {
    label: "iPad",
    options: [
      { label: "iPad Air 11\" 2360×1640/264", value: "2360x1640/264", width: 2360, height: 1640, dpi: 264 },
      { label: "iPad Pro 13\" 2752×2064/264", value: "2752x2064/264", width: 2752, height: 2064, dpi: 264 },
    ],
  },
  {
    label: "iPhone",
    options: [
      { label: "iPhone 16 2556×1179/460", value: "2556x1179/460", width: 2556, height: 1179, dpi: 460 },
      { label: "iPhone 17 Pro Max 2868×1320/460", value: "2868x1320/460", width: 2868, height: 1320, dpi: 460 },
    ],
  },
  {
    label: "Samsung",
    options: [
      { label: "Galaxy S20 Ultra 1440×3200/511", value: "1440x3200/511", width: 1440, height: 3200, dpi: 511 },
      { label: "Galaxy Tab S4 2560×1600/287", value: "2560x1600/287", width: 2560, height: 1600, dpi: 287 },
    ],
  },
  {
    label: "Google Pixel",
    options: [
      { label: "Pixel 7 1080×2400/416", value: "1080x2400/416", width: 1080, height: 2400, dpi: 416 },
    ],
  },
];

/** Flat list for lookup */
export const NEW_DISPLAY_PRESETS = NEW_DISPLAY_PRESET_GROUPS.flatMap((group) => group.options);

export const DISPLAY_IME_POLICIES = [
  { value: "", label: "默认（scrcpy 默认）" },
  { value: "local", label: "local（虚拟屏本地 IME，escrcpy 推荐）" },
  { value: "fallback", label: "fallback（回退主屏键盘）" },
  { value: "hide", label: "hide（隐藏 IME）" },
];
