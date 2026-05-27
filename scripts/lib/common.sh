#!/usr/bin/env bash
# Cloud Phone — shared install helpers. Sourced by platform scripts.

set -euo pipefail

cp_get_repo_root() {
  local script_dir="$1"
  cd "$script_dir/.." && pwd
}

cp_read_version() {
  local root="$1" vf="$root/backend/node/src/config/version.js"
  if [ -f "$vf" ]; then
    sed -n 's/.*APP_VERSION = "\([^"]*\)".*/\1/p' "$vf" | head -n1
  else
    echo "unknown"
  fi
}

cp_need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

cp_node_major() {
  node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0
}

cp_check_node() {
  if ! cp_need_cmd node; then
    return 1
  fi
  local major
  major=$(cp_node_major)
  [ "$major" -ge 18 ] 2>/dev/null
}

cp_ensure_env_file() {
  local root="$1"
  if [ -f "$root/.env" ]; then
    tui_log info ".env 已存在，跳过复制"
    return 0
  fi
  if [ -f "$root/.env.example" ]; then
    cp "$root/.env.example" "$root/.env"
    tui_log ok "已从 .env.example 创建 .env"
  else
    tui_log warn "未找到 .env.example"
  fi
}

cp_npm_install_dir() {
  local dir="$1" label="$2"
  [ -f "$dir/package.json" ] || return 0
  tui_run "npm install — $label" bash -c "cd '$dir' && npm install --no-fund --no-audit"
}

cp_npm_install_all() {
  local root="$1"
  cp_npm_install_dir "$root" "根目录"
  cp_npm_install_dir "$root/backend/node" "backend/node"
  cp_npm_install_dir "$root/frontend/web" "frontend/web"
}

cp_try_build_scrcpy_server() {
  local root="$1"
  if [ ! -f "$root/tools/build-scrcpy-server.mjs" ]; then
    tui_log warn "未找到 build-scrcpy-server.mjs，跳过"
    return 0
  fi
  if ! cp_check_node; then
    tui_log warn "Node 不可用，跳过 scrcpy-server 编译"
    return 0
  fi
  tui_run "编译魔改 scrcpy-server（Gradle）" \
    bash -c "cd '$root' && node tools/build-scrcpy-server.mjs"
}

cp_export_android_env_hint() {
  local home="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
  if [ -n "$home" ] && [ -d "$home" ]; then
    tui_log ok "ANDROID_HOME=$home"
    return 0
  fi
  local guess="$HOME/Android/Sdk"
  if [ -d "$guess" ]; then
    tui_log info "建议: export ANDROID_HOME=$guess"
    return 0
  fi
  tui_log warn "未检测到 Android SDK，投屏前需 JDK 17+ 与 SDK"
}

cp_finish_screen() {
  local root="$1" frontend_port backend_port
  frontend_port=5173
  backend_port=3000
  if [ -f "$root/.env" ]; then
    # shellcheck disable=SC1090
    set -a; . "$root/.env" 2>/dev/null || true; set +a
    frontend_port="${FRONTEND_PORT:-5173}"
    backend_port="${BACKEND_PORT:-3000}"
  fi
  tui_clear
  tui_box_open "安装完成"
  tui_box_line "仓库: $root"
  tui_box_line "启动: cd 仓库 && npm run dev"
  tui_box_line "前端: http://localhost:${frontend_port}"
  tui_box_line "后端: http://localhost:${backend_port}/health"
  tui_box_line "默认账号: admin（请尽快改密）"
  tui_box_close
}
