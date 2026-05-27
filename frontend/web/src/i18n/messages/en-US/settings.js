export default {
  settings: {
    eyebrow: "Settings",
    title: "Settings",
    desc: "Manage account, appearance, and gallery refresh.",
    navLabel: "Settings categories",
    nav: {
      account: "Account",
      appearance: "Appearance",
      refresh: "Refresh",
    },
    sections: {
      account: {
        title: "Account",
        desc: "View session status or change your login password.",
        changePassword: "Change password",
      },
      appearance: {
        title: "Appearance",
        desc: "Switch UI language and light/dark theme.",
        theme: "Theme",
      },
      refresh: {
        title: "Refresh",
        desc: "Configure automatic refresh intervals for the device gallery.",
      },
    },
    language: "Interface language",
    languageHint: "Takes effect immediately. Preference is stored in this browser.",
    deviceInterval: "Device list refresh interval (seconds)",
    screenshotInterval: "Screenshot refresh interval (seconds)",
    intervalHint:
      "Default: device list every 1s, screenshots every 5s. Previous frames are kept during background refresh.",
    save: "Save settings",
    savedFeedback: "Device list every {device}s, screenshots every {screenshot}s.",
    passwordStatus: "Password status",
    sessionExpiry: "Session expires",
  },
};
