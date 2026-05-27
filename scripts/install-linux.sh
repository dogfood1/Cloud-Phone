#!/usr/bin/env bash
# Cloud Phone — Linux 自动安装（Debian/Ubuntu/Alpine/Fedora/RHEL/Arch/openSUSE/Void 等）

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/tui.sh
source "$SCRIPT_DIR/lib/tui.sh"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"
# shellcheck source=lib/linux-distro.sh
source "$SCRIPT_DIR/lib/linux-distro.sh"

REPO_ROOT="$(cp_get_repo_root "$SCRIPT_DIR")"
APP_VERSION="$(cp_read_version "$REPO_ROOT")"

OPT_NODE=1
OPT_NPM=1
OPT_JDK=0
OPT_ANDROID=0
OPT_MESON=0
OPT_BUILD_SERVER=0

linux_show_plan() {
  tui_clear
  tui_box_open "安装计划 · $LINUX_ID ($LINUX_PKG_MGR)"
  tui_box_line "发行版: ${LINUX_ID:-unknown} ${LINUX_VERSION_ID:-}"
  tui_box_line "包族: ${LINUX_PKG_FAMILY:-unknown}"
  tui_box_line "仓库: $REPO_ROOT"
  tui_box_line ""
  [ "$OPT_NODE" = 1 ] && tui_box_line "[x] Node.js 18+"
  [ "$OPT_NPM" = 1 ] && tui_box_line "[x] npm 依赖 (根/backend/frontend)"
  [ "$OPT_JDK" = 1 ] && tui_box_line "[x] JDK 17+（编译 scrcpy-server）"
  [ "$OPT_ANDROID" = 1 ] && tui_box_line "[x] Android SDK 提示/系统包"
  [ "$OPT_MESON" = 1 ] && tui_box_line "[x] Meson + Ninja（可选桌面客户端）"
  [ "$OPT_BUILD_SERVER" = 1 ] && tui_box_line "[x] 立即编译魔改 scrcpy-server"
  tui_box_close
}

linux_configure_options() {
  if ! tui_menu "选择安装模式" \
    "推荐：Node + npm（浏览器投屏，使用仓库内置 ADB）" \
    "完整：Node + npm + JDK + Android SDK 提示 + 编译 server" \
    "自定义：逐项勾选"; then
    exit 0
  fi
  case "${TUI_MENU_CHOICE:-1}" in
    1)
      OPT_NODE=1; OPT_NPM=1; OPT_JDK=0; OPT_ANDROID=0; OPT_MESON=0; OPT_BUILD_SERVER=0;;
    2)
      OPT_NODE=1; OPT_NPM=1; OPT_JDK=1; OPT_ANDROID=1; OPT_MESON=0; OPT_BUILD_SERVER=1;;
    3)
      tui_clear
      tui_box_open "自定义组件"
      tui_confirm "安装/检查 Node.js 18+" y && OPT_NODE=1 || OPT_NODE=0
      tui_confirm "npm install 项目依赖" y && OPT_NPM=1 || OPT_NPM=0
      tui_confirm "安装 JDK 17+" n && OPT_JDK=1 || OPT_JDK=0
      tui_confirm "Android SDK（系统包或说明）" n && OPT_ANDROID=1 || OPT_ANDROID=0
      tui_confirm "Meson + Ninja" n && OPT_MESON=1 || OPT_MESON=0
      tui_confirm "编译魔改 scrcpy-server" n && OPT_BUILD_SERVER=1 || OPT_BUILD_SERVER=0
      tui_box_close
      ;;
  esac
}

linux_run_install() {
  linux_detect_distro
  if [ "$LINUX_PKG_FAMILY" = unknown ]; then
    tui_log warn "未识别发行版，将仅执行 npm 步骤"
  fi

  if [ "$OPT_NODE" = 1 ]; then
    linux_install_node || tui_log warn "Node 安装后版本仍 <18，请用 nvm/fnm 安装 Node 18+"
  fi

  if [ "$OPT_JDK" = 1 ]; then
    linux_install_jdk || tui_log warn "JDK 安装失败，可设置 CLOUD_PHONE_JAVA_HOME"
  fi

  if [ "$OPT_ANDROID" = 1 ]; then
    tui_clear
    tui_box_open "Android SDK"
    linux_install_android_hint
    tui_box_close
  fi

  if [ "$OPT_MESON" = 1 ]; then
    linux_install_build_tools || tui_log warn "Meson/Ninja 安装失败"
  fi

  cp_ensure_env_file "$REPO_ROOT"

  if [ "$OPT_NPM" = 1 ]; then
    if ! cp_check_node; then
      tui_log err "需要 Node 18+ 才能 npm install"
      exit 1
    fi
    cp_npm_install_all "$REPO_ROOT"
  fi

  if [ "$OPT_BUILD_SERVER" = 1 ]; then
    cp_try_build_scrcpy_server "$REPO_ROOT" || tui_log warn "scrcpy-server 编译失败，请检查 JDK/SDK"
  fi
}

main() {
  [ -t 0 ] || [ -t 1 ] || tui_log warn "非交互终端，部分菜单可能不可用"

  tui_banner "$APP_VERSION"
  linux_detect_distro

  tui_box_open "环境检测"
  tui_box_line "内核: $(uname -sr)"
  tui_box_line "架构: $(uname -m)"
  tui_box_line "发行版: ${LINUX_ID:-?} (${LINUX_PKG_FAMILY:-?} / ${LINUX_PKG_MGR:-?})"
  cp_check_node && tui_box_line "Node: $(node -v)" || tui_box_line "Node: 未安装"
  tui_box_close
  tui_pause

  linux_configure_options
  linux_show_plan
  tui_confirm "开始安装" y || exit 0

  linux_run_install
  cp_finish_screen "$REPO_ROOT"
}

main "$@"
