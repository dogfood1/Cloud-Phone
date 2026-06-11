export default {

  groupControl: {

    eyebrow: "Batch operations",

    title: "Group control",

    desc: "Use + to add devices. All added devices are selected by default. Touch inside the cast to control; click outside the cast area to toggle selection.",

    addDevice: "Add device",

    selectAll: "Select all",

    deselectAll: "Deselect all",

    deviceCount: "{count} selected",

    empty: "No devices added yet",

    emptyHint: "Click + in the top right to add phones for group control",

    selectedHint: "Selected · click outside cast to deselect",

    unselectedHint: "Not selected · click outside cast or preview to join",

    tapToSelect: "Tap to join group control",

    actions: {

      power: "Power",

      powerOn: "Screen on",

      powerOff: "Screen off",

      volume: "Volume",

      volumeMute: "Mute",

      volumeUp: "Increase",

      volumeDown: "Decrease",

      apps: "Apps",

      batchControl: "Batch control",

      stopBatch: "Stop batch control",

    },

    batch: {

      masterBadge: "Master",

    },

    picker: {

      title: "Select devices",

      desc: "Choose devices to add to group control. Select all is supported.",

      selectAll: "Select all",

      deselectAll: "Deselect all",

      selectedCount: "{count} selected",

      confirm: "Confirm",

      cancel: "Cancel",

      close: "Close",

      noDevices: "No available devices",

      noDevicesHint: "Connect a device via USB or wireless ADB first",

    },

    appModal: {

      title: "Batch app actions",

      desc: "Run on {count} selected online devices",

      installTab: "Install",

      uninstallTab: "Uninstall",

      apkLabel: "Choose APK file",

      packageLabel: "Package name",

      uninstallHint: "Devices without the app are skipped automatically",

      confirm: "Run",

      running: "Running…",

    },

    masterModal: {

      title: "Choose master device",

      desc: "Master is highlighted yellow; other selected devices are green and mirror actions",

      confirm: "Start batch control",

    },

    resultModal: {

      close: "Close",

      installTitle: "Batch install results",

      uninstallTitle: "Batch uninstall results",

      install_ok: "Installed",

      install_fail: "Install failed",

      uninstall_ok: "Uninstalled",

      uninstall_skip: "Not installed, skipped",

      uninstall_fail: "Uninstall failed",

    },

    cast: {

      starting: "Starting scrcpy cast…",

      preparing: "Requesting backend cast session…",

      offline: "Device offline",

      startFailed: "Failed to start cast",

      firstFrameTimeout: "Timed out waiting for first video frame",

      unsupportedBrowser: "WebCodecs is not supported. Use Chrome or Edge.",

      previewAria: "{name} group cast preview",

    },

  },

};

