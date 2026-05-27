# Cloud Phone scrcpy 集成

源码自 `projects/scrcpy` 同步到 `backend/source/scrcpy`，并增加 Cloud Phone 调用入口。

## 网络投屏原理

### 官方 scrcpy

1. 主机通过 ADB 将 `scrcpy-server.jar` 推到设备 `/data/local/tmp/`
2. 在设备上启动 Java 服务，采集屏幕/摄像头并 H.264/H.265 编码
3. 通过 `adb reverse` 或 `adb forward` 建立 **视频套接字** 与 **控制套接字**
4. 桌面客户端 (C/SDL) 接收码流解码显示，键盘鼠标事件经控制通道注入

### ws-scrcpy（协议参考，不修改 `projects/ws-scrcpy`）

1. 浏览器/Node 使用 **`scrcpy_initial` / `scrcpy_message` 魔数** 与 Annex-B H.264（见 `frontend/web` 与 `backend/node/.../ws-scrcpy-protocol.js`）
2. 设备端需在 server 内嵌 **WebSocket 服务**（NetrisTV fork 实现），或通过 Node 把官方 **framed TCP** 转成 ws-scrcpy 协议

### NetrisTV fork（`projects/scrcpy-ws-scrcpy`，对照用，非最终产物）

基于 **scrcpy 1.19**（`versionName 1.19-ws7`），与仓库内 **官方 4.0**（`backend/source/scrcpy`）架构不同，仅作 diff 参考：

| 类别 | fork 新增/改动 | 官方 4.0 |
|------|----------------|----------|
| 入口 | `Server` 第二参数 `web` → `WSServer` | `Options.parse` 全 `key=value`，`scrcpy(options)` |
| 传输 | `WSServer` + `WebSocketConnection`（端口默认 **8886**） | `DesktopConnection` + `LocalSocket` / `tunnel_forward` |
| 编码输出 | `ScreenEncoder` → `Connection.send`（可选 12 字节 PTS 头） | `SurfaceEncoder` + `Streamer`（12 字节 packet flags） |
| 控制 | `TYPE_CHANGE_STREAM_PARAMETERS`(101)、`TYPE_PUSH_FILE`(102)、`VideoSettings` | 更多官方类型（UHID、相机等），**无** 101/102 |
| 依赖 | `Java-WebSocket`、slf4j | 无第三方网络库 |
| 包结构 | 扁平 `com.genymobile.scrcpy.*`（约 42 个类） | 子包 `device/` `video/` `control/` 等（约 89 个类） |

**Cloud-Phone 目标**：在 **`backend/source/scrcpy`（官方 4.0）** 上移植 WebSocket 能力与 ws-scrcpy 线协议，本地编译 `scrcpy-server`（版本号与官方桌面客户端一致：`4.0`），避免 `scrcpy.exe` 直连时报版本不匹配。**不要**长期依赖预编译的 `1.19-ws7` jar。

**当前运行时**：`SCRCPY_SERVER_VERSION=4.0`；`SCRCPY_WEB_CAST_MODE=true` 时 Node 走 `web DEBUG 8886` 与 `/cast/ws` 代理。启动前会 `pkill -f com.genymobile.scrcpy.Server` 清理残留进程，避免 `8886` 端口占用。

## Cloud Phone 扩展参数

| 参数 | 说明 |
|------|------|
| `--cloud-phone-config=<file>` | 合并键值配置（`key=value` 或布尔 `flag` 每行） |
| `--cloud-phone-capabilities` | 输出能力 JSON（可读 `CLOUD_PHONE_SCRCPY_CAPABILITIES` 文件） |
| 环境变量 `CLOUD_PHONE_SCRCPY_CONFIG` | 默认配置文件路径 |

## 构建（Windows / Linux / macOS）

### Web 投屏必需：魔改 scrcpy-server

`scrcpy-server` 是 Android 端 APK，**与宿主操作系统无关**，但需用本仓库 Gradle 编译（含 WebSocket / ws-scrcpy 线协议），**不要用**官方 release 里的 `scrcpy-server-v4.0` 代替。

```bash
# 在仓库根目录（当前系统需 JDK 17+、Android SDK）
node tools/build-scrcpy-server.mjs

# 一次写入 windows / linux / macos 三个目录（便于跨平台部署仓库）
node tools/build-scrcpy-server.mjs --all-platforms
```

产物：`backend/bin/scrcpy/<platform>/scrcpy-server`（三份内容相同，均为魔改 APK）。

| 系统 | JDK / SDK 提示 |
|------|----------------|
| **Linux** | `openjdk-17-jdk`、`android-sdk`；可设 `JAVA_HOME`、`ANDROID_HOME` |
| **macOS** | Android Studio 自带 JBR，或 Temurin 17；SDK 通常在 `~/Library/Android/sdk` |
| **Windows** | `Program Files\Java\jdk-*` 或 Android Studio `jbr`；可设 `CLOUD_PHONE_JAVA_HOME` |

### 可选：本机 scrcpy 桌面客户端

需 Meson + Ninja。脚本会用**已编译的魔改 server** 作为 `-Dprebuilt_server`，不再走官方 `install_release.sh`（避免 sudo 安装且避免官方未魔改 server）。

```bash
# 编译本机平台的 scrcpy + 同步魔改 server 到对应 bin 目录
node tools/build-scrcpy.mjs

# 仅编译魔改 server（无 meson 时自动走此路径）
node tools/build-scrcpy.mjs --server-only
```

产物：`backend/bin/scrcpy/<platform>/scrcpy[.exe]` 与 `scrcpy-server`。

**注意**：`node tools/build-scrcpy.mjs --download` 仅下载官方预编译包，**server 无魔改**，不适合 Cloud Phone Web 投屏。

依赖详见官方 `doc/linux.md` / `doc/macos.md` / `doc/windows.md`。

## 后端 API（前端暂未对接）

- `GET /api/scrcpy/capabilities` — 能力清单
- `GET /api/scrcpy/sessions` — 会话列表
- `POST /api/scrcpy/sessions` — 启动（body 为选项对象，如 `{ "serial": "xxx", "maxSize": 1024, "noAudio": true }`）
- `GET /api/scrcpy/sessions/:id` — 查询
- `DELETE /api/scrcpy/sessions/:id` — 停止

## 同步上游源码

```bash
node tools/sync-scrcpy-source.mjs
```

从 `projects/scrcpy` 覆盖 `backend/source/scrcpy`（保留 `app/src/cloud_phone/` 与本文档需在同步后重新合并）。
