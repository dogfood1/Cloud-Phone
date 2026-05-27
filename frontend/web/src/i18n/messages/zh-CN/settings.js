export default {
  settings: {
    eyebrow: "设置",
    title: "设置",
    desc: "管理账号、外观与设备画廊刷新。",
    navLabel: "设置分类",
    nav: {
      account: "账号",
      appearance: "外观",
      refresh: "刷新",
    },
    sections: {
      account: {
        title: "账号",
        desc: "查看当前会话状态，或修改登录密码。",
        changePassword: "修改密码",
      },
      appearance: {
        title: "外观",
        desc: "切换界面语言与浅色/深色主题。",
        theme: "主题",
      },
      refresh: {
        title: "刷新",
        desc: "配置设备画廊列表与截图的自动刷新间隔。",
      },
    },
    language: "界面语言",
    languageHint: "切换后立即生效，偏好保存在本机浏览器。",
    deviceInterval: "设备列表刷新间隔（秒）",
    screenshotInterval: "截图刷新间隔（秒）",
    intervalHint: "设备列表默认每 1 秒、截图默认每 5 秒刷新；后台更新时保留上一帧画面。",
    save: "保存设置",
    savedFeedback: "设备列表每 {device} 秒、截图每 {screenshot} 秒刷新。",
    passwordStatus: "密码状态",
    sessionExpiry: "会话到期",
  },
};
