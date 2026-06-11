export default {
  groupControl: {
    eyebrow: "批次操作",
    title: "群控",
    desc: "透過 + 新增裝置；預設選中全部已新增裝置，投屏區域內直接觸控，點擊投屏區域外切換選中。",
    addDevice: "新增裝置",
    selectAll: "全選",
    deselectAll: "取消全選",
    deviceCount: "已選 {count} 台",
    empty: "尚未新增裝置",
    emptyHint: "點擊右上角 + 新增要群控的手機",
    selectedHint: "已選中 · 點擊投屏區域外取消",
    unselectedHint: "未選中 · 點擊投屏區域外或預覽圖加入",
    tapToSelect: "點擊加入群控",
    picker: {
      title: "選擇裝置",
      desc: "勾選要加入群控的裝置，支援全選。",
      selectAll: "全選",
      deselectAll: "取消全選",
      selectedCount: "已選 {count} 台",
      confirm: "確認",
      cancel: "取消",
      close: "關閉",
      noDevices: "暫無可用裝置",
      noDevicesHint: "請先透過 USB 或無線 ADB 連接裝置",
    },
    cast: {
      starting: "正在啟動 scrcpy 投屏…",
      preparing: "正在請求後端啟動投屏…",
      offline: "裝置離線",
      startFailed: "投屏啟動失敗",
      firstFrameTimeout: "等待視訊首幀逾時，請重試",
      unsupportedBrowser: "目前瀏覽器不支援 WebCodecs，請使用 Chrome 或 Edge",
      previewAria: "{name} 群控投屏",
    },
  },
};
