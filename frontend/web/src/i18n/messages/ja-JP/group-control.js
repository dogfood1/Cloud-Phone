export default {
  groupControl: {
    eyebrow: "一括操作",
    title: "群制御",
    desc: "+ でデバイスを追加。追加済みデバイスは既定で全選択。キャスト領域内でタッチ操作、領域外クリックで選択切替。",
    addDevice: "デバイスを追加",
    selectAll: "すべて選択",
    deselectAll: "選択を解除",
    deviceCount: "{count} 台選択中",
    empty: "デバイスが追加されていません",
    emptyHint: "右上の + をクリックして群制御する端末を追加してください",
    selectedHint: "選択中 · キャスト領域外クリックで解除",
    unselectedHint: "未選択 · 領域外またはプレビューをクリックで参加",
    tapToSelect: "タップして群制御に参加",
    picker: {
      title: "デバイスを選択",
      desc: "群制御に追加するデバイスを選択します。全選択に対応。",
      selectAll: "すべて選択",
      deselectAll: "選択を解除",
      selectedCount: "{count} 台選択中",
      confirm: "確認",
      cancel: "キャンセル",
      close: "閉じる",
      noDevices: "利用可能なデバイスがありません",
      noDevicesHint: "USB またはワイヤレス ADB でデバイスを接続してください",
    },
    cast: {
      starting: "scrcpy キャストを開始しています…",
      preparing: "バックエンドにキャスト開始を要求しています…",
      offline: "デバイスがオフラインです",
      startFailed: "キャストの開始に失敗しました",
      firstFrameTimeout: "初回フレーム待機がタイムアウトしました",
      unsupportedBrowser: "WebCodecs に対応していません。Chrome または Edge を使用してください",
      previewAria: "{name} 群制御キャスト",
    },
  },
};
