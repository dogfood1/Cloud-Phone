# Cloud Phone scrcpy 集成

源码自 `projects/scrcpy` 同步到 `backend/source/scrcpy`，并增加 Cloud Phone 调用入口。

## 网络投屏原理

### 官方 scrcpy

1. 主机通过 ADB 将 `scrcpy-server.jar` 推到设备 `/data/local/tmp/`
2. 在设备上启动 Java 服务，采集屏幕/摄像头并 H.264/H.265 编码
3. 通过 `adb reverse` 或 `adb forward` 建立 **视频套接字** 与 **控制套接字**
4. 桌面客户端 (C/SDL) 接收码流解码显示，键盘鼠标事件经控制通道注入

### ws-scrcpy

1. 使用修改版 scrcpy 服务端输出 H.264 NALU
2. Node 服务将 ADB 隧道数据桥接到 **WebSocket**
3. 浏览器用 MSE / WebCodecs / WASM 软解播放，并转发触控、键盘、剪贴板等

## Cloud Phone 扩展参数

| 参数 | 说明 |
|------|------|
| `--cloud-phone-config=<file>` | 合并键值配置（`key=value` 或布尔 `flag` 每行） |
| `--cloud-phone-capabilities` | 输出能力 JSON（可读 `CLOUD_PHONE_SCRCPY_CAPABILITIES` 文件） |
| 环境变量 `CLOUD_PHONE_SCRCPY_CONFIG` | 默认配置文件路径 |

## 构建（Windows / Linux / macOS）

需安装：Meson、Ninja、JDK、Android SDK 相关依赖，详见官方 `doc/windows.md` / `doc/linux.md` / `doc/macos.md`。

```bash
# 在仓库根目录
node tools/build-scrcpy.mjs
```

产物安装到 `backend/bin/scrcpy/<platform>/scrcpy[.exe]` 与 `scrcpy-server`。

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
