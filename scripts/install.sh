#!/usr/bin/env bash
# Cloud Phone — 安装入口（自动选择 Linux / macOS）

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$(uname -s)" in
  Linux)
    exec bash "$SCRIPT_DIR/install-linux.sh" "$@";;
  Darwin)
    exec bash "$SCRIPT_DIR/install-macos.sh" "$@";;
  MINGW*|MSYS*|CYGWIN*)
    echo "检测到 Windows 环境，请运行:"
    echo "  powershell -ExecutionPolicy Bypass -File scripts/install-windows.ps1"
    exit 1;;
  *)
    echo "不支持的操作系统: $(uname -s)"
    exit 1;;
esac
