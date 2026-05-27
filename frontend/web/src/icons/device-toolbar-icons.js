/**
 * Device workspace toolbar icons (24×24 stroke, Lucide-style).
 * @type {Record<string, string | string[]>}
 */
export const DEVICE_TOOLBAR_ICONS = {
  recents: [
    "M12 2 2 7l10 5 10-5-10-5z",
    "M2 12l10 5 10-5",
    "M2 17l10 5 10-5",
  ],
  home: ["M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9.5z", "M9 21v-6h6v6"],
  "arrow-left": "M19 12H5M12 19l-7-7 7-7",
  "screen-off": [
    "M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z",
    "M4 4l16 16",
  ],
  "screen-on": [
    "M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z",
    "M12 18h.01",
    "M12 7v5M9.5 9.5 12 7 14.5 9.5",
  ],
  power: ["M12 2v8", "M5.34 5.34a8 8 0 1 0 11.32 0"],
  rotate: ["M21 12a9 9 0 0 0-9-9 2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0-2.5 2.5H3", "M3 12h4"],
  volume: [
    "M11 5 6 9H3v6h3l5 4V5z",
    "M15.5 8.5a5 5 0 0 1 0 7",
    "M18.5 5.5a8.5 8.5 0 0 1 0 13",
  ],
  "volume-up": ["M11 5 6 9H3v6h3l5 4V5z", "M16 11h6", "M19 8v6"],
  "volume-down": ["M11 5 6 9H3v6h3l5 4V5z", "M16 12h6"],
  camera: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  record: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  "record-active": "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  folder: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 11.07 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",
  "folder-open": "M6 14H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7.07a2 2 0 0 1 1.66.9l.82 1.2A2 2 0 0 0 15.93 8H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2Z",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z M14 2v6h6",
  link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  "chevron-up": "M18 15l-6-6-6 6",
  "chevron-left": "M15 18l-6-6 6-6",
  "chevron-right": "M9 18l6-6-6-6",
  apps: ["M5 5h4v4H5z", "M15 5h4v4h-4z", "M5 15h4v4H5z", "M15 15h4v4h-4z"],
  terminal: ["M12 19h8", "M8 16l-4-4 4-4", "M4 19h.01", "M4 15h.01"],
};
