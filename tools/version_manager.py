from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
TARGET_VERSION_FILES = [
    ROOT_DIR / "frontend" / "web" / "package.json",
    ROOT_DIR / "backend" / "node" / "package.json",
    ROOT_DIR / "backend" / "node" / "package-lock.json",
]
BACKEND_CONSTANT_FILE = ROOT_DIR / "backend" / "node" / "src" / "config" / "version.js"


def update_json_version(file_path: Path, version: str) -> None:
    content = json.loads(file_path.read_text(encoding="utf-8"))

    if "version" in content:
        content["version"] = version

    if file_path.name == "package-lock.json":
        root_package = content.get("packages", {}).get("")
        if isinstance(root_package, dict):
            root_package["version"] = version

    file_path.write_text(
        json.dumps(content, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def update_backend_version(file_path: Path, version: str) -> None:
    original = file_path.read_text(encoding="utf-8")
    updated = re.sub(
      r'APP_VERSION = "[^"]+"',
      f'APP_VERSION = "{version}"',
      original,
      count=1,
    )
    file_path.write_text(updated, encoding="utf-8")


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python tools/version_manager.py <version>")
        return 1

    version = sys.argv[1].strip()

    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        print("Version must use semantic version format, for example: 0.2.0")
        return 1

    for file_path in TARGET_VERSION_FILES:
        update_json_version(file_path, version)

    update_backend_version(BACKEND_CONSTANT_FILE, version)
    print(f"Updated project version to {version}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
