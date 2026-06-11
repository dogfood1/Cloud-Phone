export default {
  groupControl: {
    eyebrow: "批量操作",
    title: "群控",
    desc: "通过 + 添加设备；默认选中全部已添加设备，投屏区域内直接触控，点击投屏区域外切换选中。",
    addDevice: "添加设备",
    selectAll: "全选",
    deselectAll: "取消全选",
    deviceCount: "已选 {count} 台",
    empty: "尚未添加设备",
    emptyHint: "点击右上角 + 添加要群控的手机",
    selectedHint: "已选中 · 点击投屏区域外取消",
    unselectedHint: "未选中 · 点击投屏区域外或预览图加入",
    tapToSelect: "点击加入群控",
    picker: {
      title: "选择设备",
      desc: "勾选要加入群控的设备，支持全选。",
      selectAll: "全选",
      deselectAll: "取消全选",
      selectedCount: "已选 {count} 台",
      confirm: "确认",
      cancel: "取消",
      close: "关闭",
      noDevices: "暂无可用设备",
      noDevicesHint: "请先通过 USB 或无线 ADB 连接设备",
    },
    cast: {
      starting: "正在启动 scrcpy 投屏…",
      preparing: "正在请求后端启动投屏…",
      offline: "设备离线",
      startFailed: "投屏启动失败",
      firstFrameTimeout: "等待视频首帧超时，请重试",
      unsupportedBrowser: "当前浏览器不支持 WebCodecs，请使用 Chrome 或 Edge",
      previewAria: "{name} 群控投屏",
    },
  },
};
