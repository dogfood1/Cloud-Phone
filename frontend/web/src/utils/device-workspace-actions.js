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
    kind: "cast-navigation",
    pressHold: true,
    title: "按住提高音量，Shift+按住降低音量",
  },
  { id: "screenshot", label: "截屏", icon: "camera", kind: "screenshot" },
  { id: "record", label: "录屏", icon: "record", kind: "planned" },
  { id: "files", label: "文件管理", icon: "folder", kind: "planned" },
  { id: "apps", label: "应用管理", icon: "apps", kind: "planned" },
  { id: "terminal", label: "终端", icon: "terminal", kind: "planned" },
];

export const CAST_NAVIGATION_ACTION_IDS = new Set(
  DEVICE_WORKSPACE_ACTIONS.filter((action) => action.kind === "cast-navigation").map(
    (action) => action.id,
  ),
);
