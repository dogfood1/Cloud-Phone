export default {

  groupControl: {

    eyebrow: "일괄 작업",

    title: "군 제어",

    desc: "+ 로 기기를 추가합니다. 추가된 기기는 기본으로 모두 선택됩니다. 캐스트 영역 안에서 터치 조작, 영역 밖 클릭으로 선택을 전환합니다.",

    addDevice: "기기 추가",

    selectAll: "전체 선택",

    deselectAll: "전체 해제",

    deviceCount: "{count}대 선택됨",

    empty: "추가된 기기 없음",

    emptyHint: "오른쪽 상단 + 를 눌러 군 제어할 휴대폰을 추가하세요",

    selectedHint: "선택됨 · 캐스트 영역 밖 클릭으로 해제",

    unselectedHint: "미선택 · 영역 밖 또는 미리보기 클릭으로 참여",

    tapToSelect: "탭하여 군 제어에 참여",

    actions: {

      power: "전원",

      powerOn: "화면 켜기",

      powerOff: "화면 끄기",

      volume: "볼륨",

      volumeMute: "음소거",

      volumeUp: "올리기",

      volumeDown: "내리기",

      apps: "앱",

      batchControl: "일괄 제어",

      stopBatch: "일괄 제어 종료",

    },

    batch: {

      masterBadge: "마스터",

    },

    picker: {

      title: "기기 선택",

      desc: "군 제어에 추가할 기기를 선택합니다. 전체 선택을 지원합니다.",

      selectAll: "전체 선택",

      deselectAll: "전체 해제",

      selectedCount: "{count}대 선택됨",

      confirm: "확인",

      cancel: "취소",

      close: "닫기",

      noDevices: "사용 가능한 기기 없음",

      noDevicesHint: "USB 또는 무선 ADB로 기기를 먼저 연결하세요",

    },

    appModal: {

      title: "일괄 앱 작업",

      desc: "선택된 온라인 기기 {count}대에 실행",

      installTab: "설치",

      uninstallTab: "삭제",

      apkLabel: "APK 파일 선택",

      packageLabel: "패키지 이름",

      uninstallHint: "앱이 없는 기기는 자동으로 건너뜁니다",

      confirm: "실행",

      running: "실행 중…",

    },

    masterModal: {

      title: "마스터 기기 선택",

      desc: "마스터는 노란색, 다른 선택 기기는 초록색으로 동기화",

      confirm: "일괄 제어 시작",

    },

    resultModal: {

      close: "닫기",

      installTitle: "일괄 설치 결과",

      uninstallTitle: "일괄 삭제 결과",

      install_ok: "설치 성공",

      install_fail: "설치 실패",

      uninstall_ok: "삭제 성공",

      uninstall_skip: "미설치, 건너뜀",

      uninstall_fail: "삭제 실패",

    },

    cast: {

      starting: "scrcpy 캐스트 시작 중…",

      preparing: "백엔드에 캐스트 시작을 요청하는 중…",

      offline: "기기 오프라인",

      startFailed: "캐스트 시작 실패",

      firstFrameTimeout: "첫 프레임 대기 시간 초과",

      unsupportedBrowser: "WebCodecs를 지원하지 않습니다. Chrome 또는 Edge를 사용하세요",

      previewAria: "{name} 군 제어 캐스트",

    },

  },

};

