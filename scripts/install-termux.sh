#!/usr/bin/env bash
# Cloud Phone — Termux (Android) 安装：按 Linux 宿主运行，使用 pkg + npm

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
OPT_ADB=1

termux_show_plan() {
  tui_clear
  tui_box_open "Termux 安装计划 · Android (Linux)"
  tui_box_line "Termux: ${TERMUX_VERSION:-unknown}"
  tui_box_line "架构: $(uname -m)"
  tui_box_line "仓库: $REPO_ROOT"
  tui_box_line ""
  [ "$OPT_NODE" = 1 ] && tui_box_line "[x] Node.js (pkg)"
  [ "$OPT_NPM" = 1 ] && tui_box_line "[x] npm install"
  [ "$OPT_ADB" = 1 ] && tui_box_line "[x] android-tools (adb)"
  tui_box_close
}

termux_install_node() {
  if cp_check_node; then
    tui_log ok "Node 已就绪: $(node -v)"
    return 0
  fi

  tui_run "pkg install nodejs-lts" pkg install -y nodejs-lts || \
    tui_run "pkg install nodejs" pkg install -y nodejs

  cp_check_node || {
    tui_log err "需要 Node 18+，请执行: pkg install nodejs-lts"
    return 1
  }
}

termux_install_adb() {
  if command -v adb >/dev/null 2>&1; then
    tui_log ok "adb 已就绪: $(command -v adb)"
    return 0
  fi

  tui_run "pkg install android-tools" pkg install -y android-tools
  command -v adb >/dev/null 2>&1 || tui_log warn "未找到 adb，可手动 pkg install android-tools"
}

termux_print_next_steps() {
  tui_clear
  tui_box_open "Termux 后续步骤"
  tui_box_line "1. 在手机上开启 开发者选项 → 无线调试"
  tui_box_line "2. adb pair / adb connect 本机（或 USB OTG 连接其它手机）"
  tui_box_line "3. cd 仓库 && npm run dev:backend"
  tui_box_line "4. 浏览器打开 http://127.0.0.1:3000 或 Termux 内 proot/chromium"
  tui_box_line ""
  tui_box_line "Web 投屏: 仓库已含 backend/bin/scrcpy/linux/scrcpy-server"
  tui_box_line "  若仍提示未找到: export CLOUD_PHONE_ROOT=\$PWD"
  tui_box_line ""
  tui_box_line "可选: export CLOUD_PHONE_ADB_PATH=\$(which adb)"
  tui_box_close
}

main() {
  if [ -z "${TERMUX_VERSION:-}" ]; then
    tui_log err "此脚本仅适用于 Termux（Android）。"
    exit 1
  fi

  tui_banner "$APP_VERSION"
  tui_box_open "环境检测"
  tui_box_line "宿主: Android (Termux / Linux)"
  tui_box_line "Termux: $TERMUX_VERSION"
  tui_box_line "内核: $(uname -sr)"
  tui_box_line "架构: $(uname -m)"
  cp_check_node && tui_box_line "Node: $(node -v)" || tui_box_line "Node: 未安装"
  command -v adb >/dev/null 2>&1 && tui_box_line "adb: $(command -v adb)" || tui_box_line "adb: 未安装"
  tui_box_close
  tui_pause

  termux_show_plan
  tui_confirm "开始安装" y || exit 0

  if [ "$OPT_NODE" = 1 ]; then
    termux_install_node
  fi

  if [ "$OPT_ADB" = 1 ]; then
    termux_install_adb
  fi

  cp_ensure_env_file "$REPO_ROOT"

  if [ "$OPT_NPM" = 1 ]; then
    cp_npm_install_all "$REPO_ROOT"
  fi

  cp_finish_screen "$REPO_ROOT"
  termux_print_next_steps
}

main "$@"
