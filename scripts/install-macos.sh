#!/usr/bin/env bash
# Cloud Phone — macOS 自动安装（Homebrew）

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/tui.sh
source "$SCRIPT_DIR/lib/tui.sh"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

REPO_ROOT="$(cp_get_repo_root "$SCRIPT_DIR")"
APP_VERSION="$(cp_read_version "$REPO_ROOT")"

OPT_NODE=1
OPT_NPM=1
OPT_JDK=0
OPT_BREW_TOOLS=0
OPT_MESON=0
OPT_BUILD_SERVER=0

macos_has_brew() {
  command -v brew >/dev/null 2>&1
}

macos_ensure_brew() {
  if macos_has_brew; then
    tui_log ok "Homebrew 已安装"
    return 0
  fi
  tui_log info "正在安装 Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" </dev/tty || return 1
  if [ -x /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [ -x /usr/local/bin/brew ]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
  macos_has_brew
}

macos_brew_install() {
  local formula="$1"
  if brew list --formula "$formula" &>/dev/null; then
    tui_log ok "brew: $formula 已安装"
    return 0
  fi
  tui_run "brew install $formula" brew install "$formula"
}

macos_configure_options() {
  if ! tui_menu "选择安装模式" \
    "推荐：Node + npm（内置 ADB，浏览器投屏）" \
    "完整：Node + npm + OpenJDK + 编译 scrcpy-server" \
    "自定义：逐项勾选"; then
    exit 0
  fi
  case "${TUI_MENU_CHOICE:-1}" in
    1) OPT_NODE=1; OPT_NPM=1;;
    2) OPT_NODE=1; OPT_NPM=1; OPT_JDK=1; OPT_BUILD_SERVER=1;;
    3)
      tui_confirm "Node.js (brew node@20)" y && OPT_NODE=1 || OPT_NODE=0
      tui_confirm "npm install" y && OPT_NPM=1 || OPT_NPM=0
      tui_confirm "OpenJDK 17 (brew)" n && OPT_JDK=1 || OPT_JDK=0
      tui_confirm "Meson + Ninja (brew)" n && OPT_MESON=1 || OPT_MESON=0
      tui_confirm "编译 scrcpy-server" n && OPT_BUILD_SERVER=1 || OPT_BUILD_SERVER=0
      ;;
  esac
}

macos_install_node() {
  if cp_check_node; then
    tui_log ok "Node $(node -v)"
    return 0
  fi
  macos_ensure_brew || return 1
  macos_brew_install "node@20" || macos_brew_install "node" || return 1
  if [ -d "$(brew --prefix node@20 2>/dev/null)/bin" ]; then
    tui_log info '请将 eval "$(brew --prefix node@20)/bin" 加入 shell 配置'
  fi
  cp_check_node
}

macos_install_jdk() {
  if [ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]; then
    tui_log ok "检测到 Android Studio JBR"
    return 0
  fi
  macos_ensure_brew || return 1
  macos_brew_install "openjdk@17"
  tui_log info 'export JAVA_HOME="$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home"'
}

macos_run_install() {
  if [ "$OPT_NODE" = 1 ] || [ "$OPT_JDK" = 1 ] || [ "$OPT_MESON" = 1 ]; then
    macos_ensure_brew || tui_log warn "无 Homebrew，请手动安装 Node/JDK"
  fi

  [ "$OPT_NODE" = 1 ] && macos_install_node || true
  [ "$OPT_JDK" = 1 ] && macos_install_jdk || true

  if [ "$OPT_MESON" = 1 ]; then
    macos_brew_install meson
    macos_brew_install ninja
  fi

  cp_ensure_env_file "$REPO_ROOT"

  if [ "$OPT_NPM" = 1 ]; then
    cp_check_node || { tui_log err "需要 Node 18+"; exit 1; }
    cp_npm_install_all "$REPO_ROOT"
  fi

  if [ "$OPT_BUILD_SERVER" = 1 ]; then
    local sdk="$HOME/Library/Android/sdk"
    if [ -d "$sdk" ]; then
      export ANDROID_HOME="$sdk"
      export ANDROID_SDK_ROOT="$sdk"
    fi
    cp_try_build_scrcpy_server "$REPO_ROOT" || tui_log warn "编译失败，请安装 Android Studio 或 cmdline-tools"
  fi

  cp_export_android_env_hint
}

main() {
  tui_banner "$APP_VERSION"
  tui_box_open "环境检测 · macOS"
  tui_box_line "系统: $(sw_vers -productName 2>/dev/null) $(sw_vers -productVersion 2>/dev/null)"
  tui_box_line "芯片: $(uname -m)"
  macos_has_brew && tui_box_line "Homebrew: 是" || tui_box_line "Homebrew: 否"
  cp_check_node && tui_box_line "Node: $(node -v)" || tui_box_line "Node: 未安装"
  tui_box_close
  tui_pause

  macos_configure_options
  tui_confirm "开始安装" y || exit 0
  macos_run_install
  cp_finish_screen "$REPO_ROOT"
}

main "$@"
