#!/usr/bin/env bash
# Cloud Phone — Linux distro detection and package installation.

LINUX_PKG_FAMILY=""
LINUX_PKG_MGR=""
LINUX_ID=""
LINUX_VERSION_ID=""

linux_detect_distro() {
  if [ ! -f /etc/os-release ]; then
    LINUX_PKG_FAMILY=unknown
    return
  fi
  # shellcheck disable=SC1091
  . /etc/os-release
  LINUX_ID="${ID:-unknown}"
  LINUX_VERSION_ID="${VERSION_ID:-}"

  case "$ID" in
    debian|ubuntu|linuxmint|pop|elementary|zorin|kali|raspbian)
      LINUX_PKG_FAMILY=debian; LINUX_PKG_MGR=apt;;
    alpine)
      LINUX_PKG_FAMILY=alpine; LINUX_PKG_MGR=apk;;
    fedora|nobara)
      LINUX_PKG_FAMILY=fedora; LINUX_PKG_MGR=dnf;;
    rhel|centos|rocky|alma|ol|amzn|azurelinux)
      LINUX_PKG_FAMILY=rhel
      if command -v dnf >/dev/null 2>&1; then LINUX_PKG_MGR=dnf; else LINUX_PKG_MGR=yum; fi;;
    arch|manjaro|endeavouros|garuda|cachyos)
      LINUX_PKG_FAMILY=arch; LINUX_PKG_MGR=pacman;;
    opensuse*|sles|suse)
      LINUX_PKG_FAMILY=suse; LINUX_PKG_MGR=zypper;;
    void)
      LINUX_PKG_FAMILY=void; LINUX_PKG_MGR=xbps;;
    *)
      case "${ID_LIKE:-}" in
        *debian*) LINUX_PKG_FAMILY=debian; LINUX_PKG_MGR=apt;;
        *rhel*|*fedora*) LINUX_PKG_FAMILY=rhel; LINUX_PKG_MGR=dnf;;
        *arch*) LINUX_PKG_FAMILY=arch; LINUX_PKG_MGR=pacman;;
        *suse*) LINUX_PKG_FAMILY=suse; LINUX_PKG_MGR=zypper;;
        *) LINUX_PKG_FAMILY=unknown;;
      esac
      ;;
  esac
}

linux_sudo() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    tui_log err "需要 root 或 sudo 安装系统包"
    return 1
  fi
}

linux_pkg_update() {
  case "$LINUX_PKG_FAMILY" in
    debian) linux_sudo apt-get update -qq;;
    alpine) linux_sudo apk update;;
    fedora|rhel) linux_sudo "$LINUX_PKG_MGR" makecache -y || linux_sudo "$LINUX_PKG_MGR" check-update;;
    arch) linux_sudo pacman -Sy --noconfirm;;
    suse) linux_sudo zypper refresh;;
    void) linux_sudo xbps-install -S;;
    *) tui_log warn "未知发行版，跳过包索引更新"; return 0;;
  esac
}

linux_pkg_install() {
  local pkgs=("$@")
  [ ${#pkgs[@]} -gt 0 ] || return 0
  case "$LINUX_PKG_FAMILY" in
    debian)
      linux_sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${pkgs[@]}";;
    alpine)
      linux_sudo apk add --no-cache "${pkgs[@]}";;
    fedora|rhel)
      linux_sudo "$LINUX_PKG_MGR" install -y "${pkgs[@]}";;
    arch)
      linux_sudo pacman -S --needed --noconfirm "${pkgs[@]}";;
    suse)
      linux_sudo zypper install -y "${pkgs[@]}";;
    void)
      linux_sudo xbps-install -y "${pkgs[@]}";;
    *)
      tui_log err "不支持通过脚本自动安装系统包 ($LINUX_ID)"
      tui_log info "请手动安装: ${pkgs[*]}"
      return 1;;
  esac
}

linux_node_packages() {
  case "$LINUX_PKG_FAMILY" in
    debian) echo "nodejs" "npm";;
    alpine) echo "nodejs" "npm";;
    fedora|rhel) echo "nodejs" "npm";;
    arch) echo "nodejs" "npm";;
    suse) echo "nodejs" "npm";;
    void) echo "nodejs";;
    *) echo "nodejs";;
  esac
}

linux_jdk_packages() {
  case "$LINUX_PKG_FAMILY" in
    debian) echo "openjdk-17-jdk";;
    alpine) echo "openjdk17";;
    fedora|rhel) echo "java-17-openjdk-devel";;
    arch) echo "jdk17-openjdk";;
    suse) echo "java-17-openjdk-devel";;
    void) echo "openjdk17";;
    *) echo "openjdk-17-jdk";;
  esac
}

linux_build_packages() {
  case "$LINUX_PKG_FAMILY" in
    debian) echo "meson" "ninja-build";;
    alpine) echo "meson" "ninja";;
    fedora|rhel) echo "meson" "ninja-build";;
    arch) echo "meson" "ninja";;
    suse) echo "meson" "ninja";;
    void) echo "meson" "ninja";;
    *) echo "meson" "ninja-build";;
  esac
}

linux_android_packages() {
  case "$LINUX_PKG_FAMILY" in
    debian) echo "android-sdk" "android-sdk-platform-tools";;
    alpine) echo "";;
    fedora|rhel) echo "android-tools";;
    arch) echo "android-sdk" "android-sdk-platform-tools";;
    suse) echo "android-tools";;
    *) echo "";;
  esac
}

linux_install_node() {
  if cp_check_node; then
    tui_log ok "Node $(node -v) 已满足 18+"
    return 0
  fi
  tui_log info "通过系统包管理器安装 Node.js..."
  linux_pkg_update || true
  # shellcheck disable=SC2207
  local pkgs=($(linux_node_packages))
  linux_pkg_install "${pkgs[@]}" || return 1
  cp_check_node
}

linux_install_jdk() {
  if [ -n "${JAVA_HOME:-}" ] && [ -x "${JAVA_HOME}/bin/java" ]; then
    tui_log ok "JAVA_HOME 已设置"
    return 0
  fi
  if command -v java >/dev/null 2>&1; then
    local ver
    ver=$(java -version 2>&1 | head -n1)
    tui_log ok "Java 已安装: $ver"
    return 0
  fi
  # shellcheck disable=SC2207
  local pkgs=($(linux_jdk_packages))
  linux_pkg_update || true
  linux_pkg_install "${pkgs[@]}"
}

linux_install_build_tools() {
  # shellcheck disable=SC2207
  local pkgs=($(linux_build_packages))
  linux_pkg_update || true
  linux_pkg_install "${pkgs[@]}"
}

linux_install_android_hint() {
  # shellcheck disable=SC2207
  local pkgs=($(linux_android_packages))
  if [ ${#pkgs[@]} -eq 0 ] || [ -z "${pkgs[0]}" ]; then
    tui_box_line "Alpine 等发行版请手动安装 Android cmdline-tools:"
    tui_box_line "  https://developer.android.com/studio#command-tools"
    tui_box_line "  并设置 ANDROID_HOME=\$HOME/Android/Sdk"
    return 0
  fi
  linux_pkg_update || true
  if linux_pkg_install "${pkgs[@]}"; then
    tui_log ok "已尝试安装 Android SDK 相关包"
  fi
  cp_export_android_env_hint
}
