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

    actions: {

      power: "電源",

      powerOn: "亮屏",

      powerOff: "息屏",

      volume: "音量",

      volumeMute: "靜音",

      volumeUp: "加大",

      volumeDown: "減小",

      apps: "應用",

      batchControl: "批次控制",

      stopBatch: "結束批次控制",

    },

    batch: {

      masterBadge: "主控",

    },

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

    appModal: {

      title: "批次應用操作",

      desc: "將對 {count} 台已選線上裝置執行操作",

      installTab: "安裝",

      uninstallTab: "卸載",

      apkLabel: "選擇 APK 安裝包",

      packageLabel: "應用包名",

      uninstallHint: "裝置未安裝該應用時將自動跳過",

      confirm: "開始執行",

      running: "執行中…",

    },

    masterModal: {

      title: "選擇主控裝置",

      desc: "主控端為黃色背景，其餘已選裝置為綠色並同步執行",

      confirm: "開始批次控制",

    },

    resultModal: {

      close: "關閉",

      installTitle: "批次安裝結果",

      uninstallTitle: "批次卸載結果",

      install_ok: "安裝成功",

      install_fail: "安裝失敗",

      uninstall_ok: "卸載成功",

      uninstall_skip: "未安裝，已跳過",

      uninstall_fail: "卸載失敗",

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

