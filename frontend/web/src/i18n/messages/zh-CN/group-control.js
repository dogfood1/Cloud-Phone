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

    actions: {

      power: "电源",

      powerOn: "亮屏",

      powerOff: "息屏",

      volume: "音量",

      volumeMute: "静音",

      volumeUp: "加大",

      volumeDown: "减小",

      apps: "应用",

      batchControl: "批量控制",

      stopBatch: "结束批量控制",

    },

    batch: {

      masterBadge: "主控",

    },

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

    appModal: {

      title: "批量应用操作",

      desc: "将对 {count} 台已选在线设备执行操作",

      installTab: "安装",

      uninstallTab: "卸载",

      apkLabel: "选择 APK 安装包",

      packageLabel: "应用包名",

      uninstallHint: "设备未安装该应用时将自动跳过",

      confirm: "开始执行",

      running: "执行中…",

    },

    masterModal: {

      title: "选择主控设备",

      desc: "主控端操作为黄色背景，其余已选设备为绿色并同步执行",

      confirm: "开始批量控制",

    },

    resultModal: {

      close: "关闭",

      installTitle: "批量安装结果",

      uninstallTitle: "批量卸载结果",

      install_ok: "安装成功",

      install_fail: "安装失败",

      uninstall_ok: "卸载成功",

      uninstall_skip: "未安装，已跳过",

      uninstall_fail: "卸载失败",

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

