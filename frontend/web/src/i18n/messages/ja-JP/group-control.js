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

    actions: {

      power: "電源",

      powerOn: "画面オン",

      powerOff: "画面オフ",

      volume: "音量",

      volumeMute: "ミュート",

      volumeUp: "上げる",

      volumeDown: "下げる",

      apps: "アプリ",

      batchControl: "一括制御",

      stopBatch: "一括制御を終了",

    },

    batch: {

      masterBadge: "主控",

    },

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

    appModal: {

      title: "一括アプリ操作",

      desc: "選択中のオンラインデバイス {count} 台に実行",

      installTab: "インストール",

      uninstallTab: "アンインストール",

      apkLabel: "APK ファイルを選択",

      packageLabel: "パッケージ名",

      uninstallHint: "未インストールのデバイスは自動的にスキップ",

      confirm: "実行",

      running: "実行中…",

    },

    masterModal: {

      title: "主控デバイスを選択",

      desc: "主控は黄色、他の選択デバイスは緑色で操作を同期",

      confirm: "一括制御を開始",

    },

    resultModal: {

      close: "閉じる",

      installTitle: "一括インストール結果",

      uninstallTitle: "一括アンインストール結果",

      install_ok: "インストール成功",

      install_fail: "インストール失敗",

      uninstall_ok: "アンインストール成功",

      uninstall_skip: "未インストール、スキップ",

      uninstall_fail: "アンインストール失敗",

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

