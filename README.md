# Cloud Phone

## 中文

### 项目简介
Cloud Phone 是一个前后端分离的云手机项目仓库。后端提供 API 与设备查询，前端基于 Vue 3 + Vite 构建，通过代理访问后端。

### 当前功能
- 初始化 Node.js 后端目录：`backend/node`（仅 `/health`、`/api/*`）
- 前端 Vue 3 工程：`frontend/web`（Vite 开发、构建产物 `dist/`）
- 根目录 `.env` 配置 `BACKEND_PORT`、`FRONTEND_PORT`
- 左侧 Tab：设备画廊、设置；设备工作区含顶栏控制、镜像投屏完整参数表单与开始/取消按钮
- 设备工作区默认投屏：右侧 scrcpy H.264 WebSocket 实时预览（WebCodecs、ws-scrcpy 协议）；设备端自编译 server（`4.0`），缺失时后端自动 Gradle 编译；启动前自动清理残留进程避免 8886 端口占用；视频/设备/屏幕参数（裁剪、虚拟屏预设、keep-active、IME 策略等，对齐 escrcpy）经 WebSocket type 101 下发，投屏中可热更新；编码器列表用 `adb exec-out` 查询，投屏中不阻塞、超时回退通用列表
- 设备画廊展示实时截图及 ADB 实机信息（型号、厂商、IP、系统版本、序列号、产品标识）
- 设备页汇总在线/离线数量、最近刷新时间与手动刷新
- 设备列表每 1 秒、截图每 5 秒独立刷新，后台更新时保留上一帧无加载动画
- 设置页可配置设备列表与截图刷新间隔（默认 1 秒 / 5 秒）
- 设备截图接口：`GET /api/devices/:serial/screenshot`
- 设备列表接口：`GET /api/devices`（含名称、IP、型号等）
- 镜像投屏选项接口：`GET /api/devices/:serial/mirror-options`、`GET .../video-encoders`
- 设备投屏接口：`POST /api/devices/:serial/cast/start`、`DELETE .../cast/stop`、WebSocket `.../cast/ws`
- scrcpy 源码集成：`backend/source/scrcpy`，后端会话 API `/api/scrcpy/*`（启动/停止/能力查询）
- 跨平台 scrcpy 安装：`tools/build-scrcpy-server.mjs`（编译 WebSocket 版 server）、`tools/build-scrcpy.mjs`（客户端；无 Meson 时下载官方预编译）、`tools/download-scrcpy.mjs`
- 同步源码：`tools/sync-scrcpy-source.mjs`
- 通过内置 ADB 查询连接设备与设备基础信息
- 根目录 `npm run dev` 一键启动前后端（先等待后端就绪再启动前端）
- 开发时 Vite 代理 `/api` 并检测后端连接，失败时给出明确提示
- 左下角浅色/深色主题切换，偏好本地保存
- 镜像投屏参数 UI：Naive UI 折叠分组、开关与表单；所有下拉菜单顶部内置搜索（`MirrorSearchableSelect`）
- `.cursor/skills` 内置 ui-ux-pro-max 设计技能（可选参考）
- 镜像「显示方向」经 WebSocket 正确下发（修复 codecOptions 解析）；区分采集方向与预览旋转
- 镜像可勾选「禁用视频」仅音频投屏：画布音频波纹，设备 PCM（Android 11+，需重编译 server）
- 镜像「音频」设置对齐 escrcpy：音频源、audio-code 编码器（设备 list_encoders + 回退）、比特率、audio-dup（Android 13+）；Android 12 仅浏览器出声
- 投屏中锁定镜像参数；修复触摸点关闭残留、关屏/亮屏切换、视频+音频同传；WebSocket 软重配避免管线崩溃
- 镜像「屏幕」对齐 escrcpy：分组虚拟屏预设、`--new-display`、IME/装饰选项；`--start-app` 在新建虚拟屏上启动（非主屏）
- 镜像音频默认开启，修复未勾「禁用视频」时整组音频误灰及「禁用音频」开关无法关闭的问题
- 镜像投屏顶栏：多任务/主屏/返回等导航键发送完整 DOWN+UP；设备在线可截屏下载；Shift+点击降低音量
- 顶栏导航键按住/松开与手机同步（pointer DOWN/UP）；修复仅第一次点击有效；失焦自动释放按键
- 修复关屏后无法再次点亮（正确读取亮屏状态；亮屏不再重复发送电源键）
- 工具栏旋转同步「预览旋转」；亮屏 WAKEUP+HOME 唤醒序列与视频采集重置，缓解黑屏可点无画面
- 投屏顶栏图标与布局重设计（Lucide 风格、上图标下文字）
- 修复投屏画布触摸无法控机：触摸坐标使用解码视频帧尺寸（与 scrcpy `PositionMapper` 一致）；悬停/按下/拖动/抬起按 scrcpy SDK 鼠标协议注入；WebSocket 代理与控制调试日志
- 修复投屏鼠标拖动与悬停：`primaryDown` 区分 MOVE/HOVER_MOVE；松开不再跳到左上角
- 截屏时投屏区域四周白光闪动动画反馈
- 同步前端与后端版本号到 `0.7.10`

### 启动方式
```powershell
# 推荐：根目录一键启动
cd d:\projects\Cloud-Phone
npm run dev

# 浏览器访问 http://localhost:5173（以 .env 中 FRONTEND_PORT 为准）
```

分开启动：
```powershell
npm run dev:backend   # 后端 API，默认 3000
npm run dev:frontend  # Vite 前端，默认 5173
```

生产预览：
```powershell
cd frontend/web
npm run start   # 会先 build，再托管 dist/
```

## English

### Overview
Cloud Phone is a separated frontend/backend repository for a cloud phone project. The backend exposes APIs and device discovery; the frontend is built with Vue 3 and Vite and proxies API requests to the backend.

### Current Features
- Node.js backend workspace in `backend/node` (`/health` and `/api/*` only)
- Vue 3 frontend in `frontend/web` (Vite dev server and `dist/` production build)
- Root `.env` for `BACKEND_PORT` and `FRONTEND_PORT`
- Left sidebar tabs: Devices gallery and Settings; device workspace with mirror cast settings and toolbar
- Device workspace default cast: scrcpy H.264 WebSocket preview (WebCodecs, ws-scrcpy protocol); custom `4.0` server (auto-built when missing); mirror params (crop, virtual display presets, keep-active, IME policy, escrcpy-aligned) over WebSocket type 101 with hot-reload; encoder list via `adb exec-out` with timeout/fallback during active cast
- Device gallery with live screenshots and real ADB metadata (model, manufacturer, IP, OS, serial, product)
- Device page summary with online/offline counts, last refresh time, and manual refresh
- Independent refresh: device list every 1s, screenshots every 5s; keeps previous frame without loading animation
- Configurable device list and screenshot intervals in Settings (default 1s / 5s)
- Device screenshot endpoint: `GET /api/devices/:serial/screenshot`
- Device list endpoint: `GET /api/devices` (name, IP, model, and more)
- Mirror cast options: `GET /api/devices/:serial/mirror-options`, `GET .../video-encoders`
- Device cast: `POST /api/devices/:serial/cast/start`, `DELETE .../cast/stop`, WebSocket `.../cast/ws`
- scrcpy source vendored in `backend/source/scrcpy`; backend session API `/api/scrcpy/*`
- scrcpy install: `tools/build-scrcpy-server.mjs` (WebSocket server APK), `tools/build-scrcpy.mjs` (client; downloads official prebuilt if Meson is missing), `tools/download-scrcpy.mjs`
- Sync source: `tools/sync-scrcpy-source.mjs`
- Query connected devices and basic device properties through the bundled ADB
- Root `npm run dev` starts backend first, waits for `/health`, then starts the frontend
- Vite dev proxy for `/api` with backend health check and clearer connection errors
- Light/dark theme toggle at bottom-left with persisted preference
- Mirror cast settings: Naive UI collapse/form/switch; all selects use top-of-menu search (`MirrorSearchableSelect`)
- `.cursor/skills` includes ui-ux-pro-max design skill for Cursor (optional reference)
- Mirror capture orientation applied over WebSocket (codecOptions parse fix); UI distinguishes capture vs preview rotation
- Mirror「disable video」audio-only cast: canvas waveform, device PCM over WebSocket (Android 11+, rebuild server jar)
- Mirror audio settings aligned with escrcpy: source, audio-code encoders, bitrate, audio-dup (Android 13+); SDK-aware fallback on Android 12
- Cast settings locked during session; fix show_touches, screen power toggle, video+audio PCM; soft stream reconfigure avoids pipeline crash
- Mirror screen settings (escrcpy-aligned): grouped new-display presets, IME/decorations; `--start-app` on virtual display, not main screen
- Mirror audio enabled by default; fix grayed-out audio panel and locked「disable audio」switch without toggling video-only mode
- Mirror cast toolbar: recents/home/back/power/volume/rotate send full DOWN+UP key pairs; screenshot download when device online; Shift+click for volume-down
- Toolbar navigation: pointer press/release maps to device key DOWN/UP; fix first-click-only; release keys on blur
- Fix screen-on after turn-off (read `displayScreenOn` via unref; omit duplicate POWER wake on client)
- Toolbar rotate syncs preview rotation (°); display wake sequence + capture reset for black-screen-after-on
- Mirror cast toolbar icons and layout refresh (Lucide-style, icon above label)
- Fix cast canvas touch not controlling device: use decoded video frame size for injection; scrcpy SDK mouse hover/press/release; WebSocket proxy and control debug logging
- Fix cast mouse drag and hover (`primaryDown` for MOVE vs HOVER_MOVE); release no longer jumps to top-left
- Screenshot action: white edge-glow flash on cast viewport
- Sync frontend and backend versions to `0.7.10`

### Getting Started
```powershell
# Recommended: start both from repo root
cd d:\projects\Cloud-Phone
npm run dev

# Open http://localhost:5173 (see FRONTEND_PORT in .env)
```

Separate terminals:
```powershell
npm run dev:backend   # API, default port 3000
npm run dev:frontend  # Vite UI, default port 5173
```

Production preview:
```powershell
cd frontend/web
npm run start   # builds then serves dist/
```
