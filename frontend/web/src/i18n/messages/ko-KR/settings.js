export default {
  settings: {
    eyebrow: "설정",
    title: "설정",
    desc: "계정, 외관, 갤러리 새로고침을 관리합니다.",
    navLabel: "설정 분류",
    nav: {
      account: "계정",
      appearance: "외관",
      refresh: "새로고침",
    },
    sections: {
      account: {
        title: "계정",
        desc: "세션 상태를 확인하거나 로그인 비밀번호를 변경합니다.",
        changePassword: "비밀번호 변경",
      },
      appearance: {
        title: "외관",
        desc: "UI 언어와 라이트/다크 테마를 전환합니다.",
        theme: "테마",
      },
      refresh: {
        title: "새로고침",
        desc: "기기 갤러리 목록과 스크린샷 자동 새로고침 간격을 설정합니다.",
      },
    },
    language: "UI 언어",
    languageHint: "전환 후 즉시 적용되며, 설정은 브라우저에 저장됩니다.",
    deviceInterval: "기기 목록 새로고침 간격(초)",
    screenshotInterval: "스크린샷 새로고침 간격(초)",
    intervalHint:
      "기본: 목록 1초, 스크린샷 5초. 백그라운드 업데이트 중에도 이전 프레임을 유지합니다.",
    save: "설정 저장",
    savedFeedback: "목록 {device}초, 스크린샷 {screenshot}초마다 새로고침합니다.",
    passwordStatus: "비밀번호 상태",
    sessionExpiry: "세션 만료",
  },
};
