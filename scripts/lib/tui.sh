#!/usr/bin/env bash
# Cloud Phone — terminal pseudo-GUI (ANSI). Sourced, not executed directly.

TUI_WIDTH="${TUI_WIDTH:-72}"
TUI_SEL=0

if [ -t 1 ] && command -v tput >/dev/null 2>&1; then
  TUI_NC=$(tput cols 2>/dev/null || echo 80)
  [ "$TUI_NC" -ge 40 ] 2>/dev/null && TUI_WIDTH=$((TUI_NC - 4))
fi

tui_c_reset() { printf '\033[0m'; }
tui_c_bold()  { printf '\033[1m'; }
tui_c_dim()   { printf '\033[2m'; }
tui_c_red()   { printf '\033[31m'; }
tui_c_green() { printf '\033[32m'; }
tui_c_yellow(){ printf '\033[33m'; }
tui_c_blue()  { printf '\033[34m'; }
tui_c_cyan()  { printf '\033[36m'; }
tui_c_white() { printf '\033[37m'; }

tui_clear() { printf '\033[2J\033[H'; }

tui_repeat() {
  local ch="$1" n="$2" i
  for ((i = 0; i < n; i++)); do printf '%s' "$ch"; done
}

tui_pad_line() {
  local text="$1" w="$2" len
  len=${#text}
  printf '%s' "$text"
  if [ "$len" -lt "$w" ]; then tui_repeat ' ' $((w - len)); fi
}

tui_box_open() {
  local title="$1"
  tui_c_cyan; tui_repeat '─' "$TUI_WIDTH"; tui_c_reset; printf '\n'
  if [ -n "$title" ]; then
    tui_c_bold; printf '  %s\n' "$title"; tui_c_reset
    tui_c_dim; tui_repeat '─' "$TUI_WIDTH"; tui_c_reset; printf '\n'
  fi
}

tui_box_line() {
  local msg="$1"
  printf '  '; tui_pad_line "$msg" $((TUI_WIDTH - 2)); printf '\n'
}

tui_box_close() {
  tui_c_cyan; tui_repeat '─' "$TUI_WIDTH"; tui_c_reset; printf '\n\n'
}

tui_log() {
  local level="$1" msg="$2"
  case "$level" in
    ok)    tui_c_green;  printf '  [OK] ';;
    warn)  tui_c_yellow; printf '  [!] ';;
    err)   tui_c_red;    printf '  [X] ';;
    info)  tui_c_blue;   printf '  [i] ';;
    run)   tui_c_cyan;   printf '  [>] ';;
    *)     printf '  [-] ';;
  esac
  printf '%s' "$msg"; tui_c_reset; printf '\n'
}

tui_spinner() {
  local pid="$1" msg="$2" frames='|/-\' i=0
  while kill -0 "$pid" 2>/dev/null; do
    printf '\r  %s %s ' "${frames:i:1}" "$msg"
    i=$(((i + 1) % 4))
    sleep 0.12
  done
  wait "$pid"
  local ec=$?
  printf '\r'
  return "$ec"
}

tui_run() {
  local msg="$1"
  shift
  tui_log run "$msg"
  ("$@") >/tmp/cloud-phone-install.log 2>&1 &
  local pid=$!
  if tui_spinner "$pid" "$msg"; then
    tui_log ok "$msg"
    return 0
  fi
  tui_log err "$msg (exit $?)"
  tail -n 8 /tmp/cloud-phone-install.log 2>/dev/null | sed 's/^/      /'
  return 1
}

tui_pause() {
  tui_c_dim
  printf '\n  按 Enter 继续...'
  tui_c_reset
  read -r _ </dev/tty 2>/dev/null || read -r _
}

tui_menu() {
  # tui_menu "title" "opt1" "opt2" ...  → sets TUI_MENU_CHOICE (1-based)
  local title="$1"
  shift
  local -a items=("$@")
  local count=${#items[@]} choice=1 key

  while true; do
    tui_clear
    tui_box_open "$title"
    local i=1
    for item in "${items[@]}"; do
      if [ "$i" -eq "$choice" ]; then
        tui_c_green; tui_box_line " > $i) $item"; tui_c_reset
      else
        tui_box_line "   $i) $item"
      fi
      i=$((i + 1))
    done
    tui_box_close
    tui_c_dim
    printf '  ↑/↓ 选择 · Enter 确认 · q 退出\n'
    tui_c_reset
    IFS= read -rsn1 key </dev/tty 2>/dev/null || IFS= read -rsn1 key
    case "$key" in
      $'\x1b')
        read -rsn2 key </dev/tty 2>/dev/null || true
        case "$key" in
          '[A') choice=$((choice > 1 ? choice - 1 : count));;
          '[B') choice=$((choice < count ? choice + 1 : 1));;
        esac
        ;;
      ''|$'\n') TUI_MENU_CHOICE=$choice; return 0;;
      q|Q) return 1;;
      [1-9])
        if [ "$key" -le "$count" ] 2>/dev/null; then
          TUI_MENU_CHOICE=$key
          return 0
        fi
        ;;
    esac
  done
}

tui_confirm() {
  local prompt="$1" default="${2:-y}"
  tui_c_yellow
  if [ "$default" = y ]; then
    printf '  %s [Y/n]: ' "$prompt"
  else
    printf '  %s [y/N]: ' "$prompt"
  fi
  tui_c_reset
  read -r ans </dev/tty 2>/dev/null || read -r ans
  ans=$(printf '%s' "$ans" | tr '[:upper:]' '[:lower:]')
  case "$ans" in
    y|yes) return 0;;
    n|no) return 1;;
    '')
      if [ "$default" = y ]; then return 0; else return 1; fi
      ;;
    *) return 1;;
  esac
}

tui_banner() {
  local ver="$1"
  tui_clear
  tui_c_cyan
  cat <<'EOF'
    ╔═══════════════════════════════════════════════════════╗
    ║              Cloud Phone · 安装向导                   ║
    ╚═══════════════════════════════════════════════════════╝
EOF
  tui_c_reset
  tui_c_dim
  printf '    命令行伪图形界面 · 本地 Web 安卓控制台\n'
  [ -n "$ver" ] && printf '    版本 %s\n' "$ver"
  tui_c_reset
  printf '\n'
}
