import json
import os
import shutil
import sys
import traceback
from pathlib import Path

from apple_signer import AppleSignError, sign_ipa
from pmd_helpers import (
    emit,
    forward_port,
    install_ipa,
    is_wda_installed,
    launch_wda,
    list_usb_devices,
    pick_device,
    resolve_udid,
    wait_for_wda,
)


def fail(step, error):
    message = str(error)
    emit(step, "error", message, None, {"error": message, "code": getattr(error, "code", step)})
    sys.exit(1)


def main():
    try:
        config = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError as error:
        fail("prepare", error)

    ipa_path = config.get("ipaPath")
    signed_dir = config.get("signedDir")
    certs_dir = config.get("certsDir")
    sign_script_path = config.get("signScriptPath")
    node_path = config.get("nodePath")
    bundle_id = config.get("bundleId", "com.facebook.WebDriverAgentRunner.xctrunner")
    http_port = int(config.get("httpPort", 8100))
    mjpeg_port = int(config.get("mjpegPort", 9100))
    apple_id = (config.get("appleId") or "").strip()
    password = config.get("password") or ""
    skip_install = bool(config.get("skipInstall"))
    skip_sign = bool(config.get("skipSign"))
    udid = (config.get("udid") or "").strip() or None

    try:
        emit("prepare", "running", "检查 IPA 与 Python 依赖…", 5)

        if not ipa_path or not os.path.exists(ipa_path):
            if skip_install and skip_sign:
                emit("prepare", "running", "未找到 IPA，已跳过签名与安装，将直接连接设备…", 7)
            else:
                raise RuntimeError(f"未找到 WDA IPA：{ipa_path or 'backend/bin/wda/wda.ipa'}")

        try:
            import pymobiledevice3  # noqa: F401
        except ImportError as error:
            raise RuntimeError(
                "未安装 pymobiledevice3，请执行: python -m pip install -r backend/assets/ios/requirements.txt"
            ) from error

        os.makedirs(signed_dir, exist_ok=True)
        signed_ipa = os.path.join(signed_dir, "wda-signed.ipa")

        emit("prepare", "done", "准备工作完成", 10)

        if skip_sign:
            emit("sign", "running", "已跳过签名…", 60)
            if ipa_path and os.path.exists(ipa_path):
                shutil.copyfile(ipa_path, signed_ipa)
            emit("sign", "done", "已跳过签名", 60)
        else:
            if not apple_id or not password:
                raise RuntimeError("签名需要 Apple ID 与密码。")

            emit("login", "running", "正在验证 Apple ID…", 20)

            try:
                sign_ipa(
                    apple_id,
                    password,
                    ipa_path,
                    signed_ipa,
                    bundle_id,
                    certs_dir,
                    emit,
                    node_path=node_path,
                    sign_script_path=sign_script_path,
                )
            except AppleSignError as error:
                raise RuntimeError(str(error)) from error

            emit("login", "done", "Apple ID 登录成功", 30)
            emit("sign", "done", "IPA 签名完成", 60)

        emit("install", "running", "正在检测 USB 设备…", 65)
        devices = list_usb_devices()
        device = pick_device(devices, udid)
        device_udid = resolve_udid(device)

        if skip_install:
            emit("install", "done", "已跳过安装（假定 WDA 已安装）", 75)
        else:
            if is_wda_installed(device_udid, bundle_id):
                emit("install", "running", "检测到 WDA 已安装，跳过安装步骤…", 72)
            else:
                emit("install", "running", "正在安装 WDA 到设备…", 70)
                install_ipa(device_udid, signed_ipa)

            emit("install", "done", "WDA 安装完成", 75)

        emit("discover", "running", "正在转发端口并启动 WDA…", 80)
        forward_port(device_udid, http_port, http_port)
        forward_port(device_udid, mjpeg_port, mjpeg_port)
        launch_wda(device_udid, bundle_id)
        status_payload = wait_for_wda(http_port)
        emit("discover", "done", "已检测到 WDA HTTP 服务", 90, {"status": status_payload})

        emit(
            "connect",
            "done",
            "设备已就绪，可开始连接",
            100,
            {
                "result": {
                    "udid": device_udid,
                    "host": "127.0.0.1",
                    "httpPort": http_port,
                    "mjpegPort": mjpeg_port,
                    "bundleId": bundle_id,
                    "deviceName": device.get("DeviceName") or device.get("ProductType") or "iPhone",
                },
            },
        )
    except Exception as error:
        step = "prepare"

        if "Apple ID" in str(error):
            step = "login"
        elif "签名" in str(error) or "zsign" in str(error) or "wasm" in str(error):
            step = "sign"
        elif "安装" in str(error):
            step = "install"
        elif "WDA" in str(error) or "USB" in str(error):
            step = "discover"

        emit(step, "error", str(error), None, {"trace": traceback.format_exc()})
        sys.exit(1)


if __name__ == "__main__":
    main()
