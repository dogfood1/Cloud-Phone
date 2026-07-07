import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path


def emit(step, status, message, progress=None, extra=None):
    payload = {
        "step": step,
        "status": status,
        "message": message,
    }

    if progress is not None:
        payload["progress"] = progress

    if extra:
        payload.update(extra)

    print(json.dumps(payload, ensure_ascii=False), flush=True)


def run_cmd(cmd, *, cwd=None, timeout=600):
    completed = subprocess.run(
        cmd,
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )

    if completed.returncode != 0:
        detail = (completed.stderr or completed.stdout or "").strip()
        raise RuntimeError(detail or f"Command failed: {' '.join(cmd)}")

    return completed.stdout.strip()


def list_usb_devices():
    output = run_cmd([sys.executable, "-m", "pymobiledevice3", "usbmux", "list"], timeout=60)
    devices = []

    for line in output.splitlines():
        line = line.strip()
        if not line:
            continue

        try:
            devices.append(json.loads(line))
        except json.JSONDecodeError:
            continue

    return devices


def pick_device(devices, udid=None):
    if not devices:
        raise RuntimeError("未检测到 USB 连接的 iPhone，请连接设备并信任此电脑。")

    if udid:
        for device in devices:
            if device.get("UniqueDeviceID") == udid or device.get("Identifier") == udid:
                return device

        raise RuntimeError(f"未找到 UDID 为 {udid} 的设备。")

    return devices[0]


def resolve_udid(device):
    return device.get("UniqueDeviceID") or device.get("Identifier") or device.get("SerialNumber")


def forward_port(udid, local_port, remote_port):
    run_cmd(
        [
            sys.executable,
            "-m",
            "pymobiledevice3",
            "usbmux",
            "forward",
            str(local_port),
            str(remote_port),
            "--serial",
            udid,
        ],
        timeout=60,
    )


def install_ipa(udid, ipa_path):
    run_cmd(
        [
            sys.executable,
            "-m",
            "pymobiledevice3",
            "apps",
            "install",
            ipa_path,
            "--udid",
            udid,
        ],
        timeout=900,
    )


def is_wda_installed(udid, bundle_id):
    try:
        output = run_cmd(
            [sys.executable, "-m", "pymobiledevice3", "apps", "list", "--udid", udid],
            timeout=120,
        )
    except RuntimeError:
        return False

    return bundle_id in output


def launch_wda(udid, bundle_id):
    commands = [
        [sys.executable, "-m", "pymobiledevice3", "developer", "dvt", "launch", bundle_id, "--udid", udid],
        [sys.executable, "-m", "pymobiledevice3", "apps", "launch", bundle_id, "--udid", udid],
    ]

    last_error = None

    for cmd in commands:
        try:
            run_cmd(cmd, timeout=120)
            return
        except RuntimeError as error:
            last_error = error

    raise RuntimeError(last_error.args[0] if last_error else "无法启动 WDA。")


def wait_for_wda(http_port, retries=30, delay=1.0):
    import time
    import urllib.error
    import urllib.request

    url = f"http://127.0.0.1:{http_port}/status"

    for attempt in range(retries):
        try:
            with urllib.request.urlopen(url, timeout=3) as response:
                if response.status == 200:
                    return json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            time.sleep(delay)

    raise RuntimeError("WDA 已安装但 HTTP 服务未就绪，请确认开发者模式已开启并重试。")
