/** Toolbar buttons above mirror cast viewport. */
export const DEVICE_WORKSPACE_ACTIONS = [
  { id: "recents", label: "多任务", icon: "recents", kind: "cast-navigation", pressHold: true },
  { id: "home", label: "主屏幕", icon: "home", kind: "cast-navigation", pressHold: true },
  { id: "back", label: "返回", icon: "arrow-left", kind: "cast-navigation", pressHold: true },
  { id: "screen-off", label: "关闭屏幕", icon: "screen-off", kind: "cast-navigation", pressHold: false },
  { id: "power", label: "电源", icon: "power", kind: "cast-navigation", pressHold: true },
  {
    id: "rotate",
    label: "旋转",
    icon: "rotate",
    kind: "cast-navigation",
    pressHold: false,
    title: "顺时针旋转预览 90°（同步左侧「预览旋转」）",
  },
  {
    id: "volume",
    label: "音量",
    icon: "volume",
    kind: "volume-menu",
    pressHold: false,
    title: "点击展开音量调节",
  },
  { id: "screenshot", label: "截屏", icon: "camera", kind: "screenshot" },
  {
    id: "record",
    label: "录屏",
    icon: "record",
    kind: "record",
    title: "录制投屏：有画面保存 MP4，仅音频保存 MP3",
  },
  {
    id: "files",
    label: "文件管理",
    icon: "folder",
    kind: "files",
    title: "浏览设备文件系统（根为 /，默认打开 /storage/emulated/0）",
  },
  { id: "apps", label: "应用管理", icon: "apps", kind: "apps", title: "列出已安装应用、安装/卸载、冻结与导出 APK" },
  {
    id: "terminal",
    label: "终端",
    icon: "terminal",
    kind: "terminal",
    title: "ADB Shell 交互终端（支持 Tab、方向键与彩色输出）",
  },
];

export const VOLUME_SUB_ACTIONS = [
  { id: "volume-up", label: "增加", icon: "volume-up" },
  { id: "volume-down", label: "减小", icon: "volume-down" },
];

export const CAST_NAVIGATION_ACTION_IDS = new Set(
  DEVICE_WORKSPACE_ACTIONS.filter((action) => action.kind === "cast-navigation").map(
    (action) => action.id,
  ),
);
