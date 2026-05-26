/** Toolbar buttons above mirror cast viewport. */
export const DEVICE_WORKSPACE_ACTIONS = [
  { id: "recents", label: "多任务", icon: "recents", kind: "cast-navigation" },
  { id: "home", label: "主屏幕", icon: "home", kind: "cast-navigation" },
  { id: "back", label: "返回", icon: "arrow-left", kind: "cast-navigation" },
  { id: "screen-off", label: "关闭屏幕", icon: "screen-off", kind: "cast-navigation" },
  { id: "power", label: "电源", icon: "power", kind: "cast-navigation" },
  { id: "rotate", label: "旋转", icon: "rotate", kind: "cast-navigation" },
  {
    id: "volume",
    label: "音量",
    icon: "volume",
    kind: "cast-navigation",
    title: "点击提高音量，Shift+点击降低音量",
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
