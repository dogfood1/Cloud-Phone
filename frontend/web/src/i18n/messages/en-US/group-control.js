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
