import base64
import json
import os
import plistlib
import shutil
import subprocess
import tempfile
import uuid
from pathlib import Path

import requests
import srp


ANISETTE_URL = os.environ.get("CLOUD_PHONE_ANISETTE_URL", "https://ani.sidestore.io/v3/getAnisetteHeaders")
GSA_URL = "https://gsa.apple.com/grandslam/GsService2"
DEV_SERVICES = "https://developerservices2.apple.com/services/QH65B2"


class AppleSignError(RuntimeError):
    pass


def _fetch_anisette():
    response = requests.get(ANISETTE_URL, timeout=20)
    response.raise_for_status()
    payload = response.json()
    headers = payload.get("headers", payload)

    if not isinstance(headers, dict):
        raise AppleSignError("Anisette 响应无效，请检查 CLOUD_PHONE_ANISETTE_URL。")

    return headers


def login_apple_id(apple_id, password):
    anisette = _fetch_anisette()
    username = apple_id.strip().lower()
    client = srp.Client(username, password, hash_alg=srp.SHA256, ng_type=srp.NG_2048_BIT)
    a_b64 = base64.b64encode(client.get_public_bytes()).decode("ascii")

    headers = {
        "Content-Type": "text/x-xml-plist",
        "Accept": "text/x-xml-plist",
        "User-Agent": "Configurator/2.0 (com.apple.Configurator; 2.0)",
    }

    for key, value in anisette.items():
        headers[str(key)] = str(value)

    init_body = {
        "Header": {"Version": "1.0.1"},
        "Request": {
            "A2k": a_b64,
            "cpd": {
                "AppleIDClientIdentifier": str(uuid.uuid4()).upper(),
                "Bootstrap": True,
                "ClientAppName": "Configurator",
                "ClientBundleID": "com.apple.configurator",
            },
            "o": "init",
            "ps": ["s2k", "s2k_fo"],
            "u": username,
        },
    }

    init_response = requests.post(GSA_URL, headers=headers, data=plistlib.dumps(init_body), timeout=30)
    init_response.raise_for_status()
    init_payload = plistlib.loads(init_response.content)
    response_block = init_payload.get("Response", {})

    salt = base64.b64decode(response_block.get("s", ""))
    b_bytes = base64.b64decode(response_block.get("B", ""))
    iterations = int(response_block.get("i", 0))
    protocol = response_block.get("sp", "s2k")

    if protocol not in ("s2k", "s2k_fo"):
        raise AppleSignError(f"不支持的 SRP 协议: {protocol}")

    m1 = client.process_challenge(salt, b_bytes, iterations)
    complete_body = {
        "Header": {"Version": "1.0.1"},
        "Request": {
            "M1": base64.b64encode(m1).decode("ascii"),
            "c": response_block.get("c", ""),
            "cpd": init_body["Request"]["cpd"],
            "o": "complete",
            "u": username,
        },
    }

    complete_response = requests.post(
        GSA_URL,
        headers=headers,
        data=plistlib.dumps(complete_body),
        timeout=30,
    )
    complete_response.raise_for_status()
    complete_payload = plistlib.loads(complete_response.content)
    status = complete_payload.get("Response", {}).get("Status", {})

    if status.get("ec") != 0:
        raise AppleSignError(status.get("em", "Apple ID 登录失败"))

    return {"headers": headers, "username": username}


def _dev_post(headers, action, params):
    request_headers = dict(headers)
    request_headers["Content-Type"] = "text/x-www-plist"
    request_headers["Accept"] = "text/x-xml-plist"
    request_headers["X-Apple-App-Info"] = "com.apple.gs.xcode.auth"
    request_headers["X-Xcode-Version"] = "16.0 (16A242d)"

    body = {
        "clientId": "XABBG36SBA",
        "protocolVersion": "QH65B2",
        "requestId": str(uuid.uuid4()).upper(),
        "userLocale": "en_US",
    }
    body.update(params)

    response = requests.post(
        f"{DEV_SERVICES}/{action}",
        headers=request_headers,
        data=plistlib.dumps(body),
        timeout=60,
    )
    response.raise_for_status()
    payload = plistlib.loads(response.content)

    if payload.get("resultCode") != 0:
        message = payload.get("userString") or payload.get("resultString") or action
        raise AppleSignError(message)

    return payload


def _generate_key_and_csr(work_dir):
    key_path = Path(work_dir) / "key.pem"
    csr_path = Path(work_dir) / "request.csr"

    subprocess.run(
        ["openssl", "genrsa", "-out", str(key_path), "2048"],
        check=True,
        capture_output=True,
        text=True,
    )
    subprocess.run(
        [
            "openssl",
            "req",
            "-new",
            "-key",
            str(key_path),
            "-out",
            str(csr_path),
            "-subj",
            "/CN=CloudPhone WDA",
        ],
        check=True,
        capture_output=True,
        text=True,
    )

    return key_path, csr_path.read_bytes()


def _load_cached_assets(certs_dir):
    p12 = Path(certs_dir) / "dev.p12"
    mobileprovision = Path(certs_dir) / "dev.mobileprovision"
    password_file = Path(certs_dir) / "dev.p12.password"

    if not p12.exists() or not mobileprovision.exists():
        return None

    password = password_file.read_text(encoding="utf8").strip() if password_file.exists() else "cloudphone"

    return {
        "p12": str(p12),
        "p12_password": password,
        "mobileprovision": str(mobileprovision),
    }


def _create_signing_assets(session, bundle_id, work_dir):
    headers = session["headers"]
    teams_payload = _dev_post(headers, "listTeams.action", {})
    teams = teams_payload.get("teams", [])

    if not teams:
        raise AppleSignError("此 Apple ID 没有可用的开发团队。")

    team = teams[0]
    team_id = team.get("teamId")
    key_path, csr_bytes = _generate_key_and_csr(work_dir)

    cert_payload = _dev_post(
        headers,
        "submitDevelopmentCSR.action",
        {
            "teamId": team_id,
            "CSR": csr_bytes,
            "machineId": str(uuid.uuid4()).upper(),
        },
    )

    cert_content = cert_payload.get("certContent")
    if not cert_content:
        raise AppleSignError("Apple 未返回开发证书。")

    cert_path = Path(work_dir) / "cert.pem"
    p12_path = Path(work_dir) / "dev.p12"
    mobileprovision_path = Path(work_dir) / "dev.mobileprovision"
    cert_path.write_bytes(base64.b64decode(cert_content))

    app_payload = _dev_post(
        headers,
        "addAppId.action",
        {
            "teamId": team_id,
            "appId": bundle_id,
            "appIdName": "WebDriverAgentRunner",
            "entitlements": {
                "get-task-allow": True,
                "application-identifier": f"{team.get('teamAgent', team_id)}.{bundle_id}",
            },
        },
    )

    app_id_id = app_payload.get("appIdId")
    profile_payload = _dev_post(
        headers,
        "downloadTeamProvisioningProfile.action",
        {
            "teamId": team_id,
            "appIdId": app_id_id,
        },
    )

    profile_data = profile_payload.get("provisioningProfile")
    if not profile_data:
        raise AppleSignError("无法下载 mobileprovision 描述文件。")

    mobileprovision_path.write_bytes(base64.b64decode(profile_data))

    p12_password = "cloudphone"
    subprocess.run(
        [
            "openssl",
            "pkcs12",
            "-export",
            "-out",
            str(p12_path),
            "-inkey",
            str(key_path),
            "-in",
            str(cert_path),
            "-password",
            f"pass:{p12_password}",
        ],
        check=True,
        capture_output=True,
        text=True,
    )

    return {
        "p12": str(p12_path),
        "p12_password": p12_password,
        "mobileprovision": str(mobileprovision_path),
    }


def _run_zsign(zsign_path, input_ipa, output_ipa, assets, bundle_id):
    cmd = [
        zsign_path,
        "-f",
        "-k",
        assets["p12"],
        "-p",
        assets["p12_password"],
        "-m",
        assets["mobileprovision"],
        "-b",
        bundle_id,
        "-o",
        output_ipa,
        input_ipa,
    ]

    completed = subprocess.run(cmd, capture_output=True, text=True, check=False)

    if completed.returncode != 0:
        detail = (completed.stderr or completed.stdout or "").strip()
        raise AppleSignError(detail or "zsign 签名失败")


def sign_ipa(apple_id, password, input_ipa, output_ipa, bundle_id, zsign_path, certs_dir, emit):
    emit("sign", "running", "正在登录 Apple ID…", 35)

    if not zsign_path or not os.path.exists(zsign_path):
        raise AppleSignError("未找到 zsign，请将 zsign.exe 放到 backend/bin/wda/。")

    if not shutil.which("openssl"):
        raise AppleSignError("未找到 openssl，请安装 OpenSSL 并加入 PATH。")

    session = login_apple_id(apple_id, password)
    emit("sign", "running", "Apple ID 验证成功，准备签名材料…", 42)

    cached = _load_cached_assets(certs_dir)

    if cached:
        emit("sign", "running", "使用 backend/bin/wda/certs 缓存证书签名…", 50)
        assets = cached
    else:
        emit("sign", "running", "正在向 Apple 申请开发证书与描述文件…", 48)
        with tempfile.TemporaryDirectory(prefix="cloudphone-wda-sign-") as work_dir:
            assets = _create_signing_assets(session, bundle_id, work_dir)
            emit("sign", "running", "正在签名 IPA…", 55)
            _run_zsign(zsign_path, input_ipa, output_ipa, assets, bundle_id)
            emit("sign", "running", "签名完成", 60)
            return

    emit("sign", "running", "正在签名 IPA…", 55)
    _run_zsign(zsign_path, input_ipa, output_ipa, assets, bundle_id)
    emit("sign", "running", "签名完成", 60)
