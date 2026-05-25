# Cloud Phone

## 中文

### 项目简介
Cloud Phone 是一个前后端分离的云手机项目仓库。后端提供 API 与设备查询，前端基于 Vue 3 + Vite 构建，通过代理访问后端。

### 当前功能
- 初始化 Node.js 后端目录：`backend/node`（仅 `/health`、`/api/*`）
- 前端 Vue 3 工程：`frontend/web`（Vite 开发、构建产物 `dist/`）
- 根目录 `.env` 配置 `BACKEND_PORT`、`FRONTEND_PORT`
- 左侧 Tab：设备画廊、设置
- 设备画廊展示实时截图及 ADB 实机信息（型号、厂商、IP、系统版本、序列号、产品标识）
- 设备页汇总在线/离线数量、最近刷新时间与手动刷新
- 设备列表每 1 秒、截图每 5 秒独立刷新，后台更新时保留上一帧无加载动画
- 设置页可配置设备列表与截图刷新间隔（默认 1 秒 / 5 秒）
- 设备截图接口：`GET /api/devices/:serial/screenshot`
- 设备列表接口：`GET /api/devices`（含名称、IP、型号等）
- scrcpy 源码集成：`backend/source/scrcpy`，后端会话 API `/api/scrcpy/*`（启动/停止/能力查询）
- 跨平台构建脚本：`tools/build-scrcpy.mjs`、`tools/sync-scrcpy-source.mjs`
- 通过内置 ADB 查询连接设备与设备基础信息
- 根目录 `npm run dev` 一键启动前后端（先等待后端就绪再启动前端）
- 开发时 Vite 代理 `/api` 并检测后端连接，失败时给出明确提示
- 左下角浅色/深色主题切换，偏好本地保存
- ui-ux-pro-max 设计系统：玻璃质感卡片、SVG 图标、优化排版与对比度
- `.cursor/skills` 内置 ui-ux-pro-max 设计技能
- 同步前端与后端版本号到 `0.3.7`

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
- Left sidebar tabs: Devices gallery and Settings
- Device gallery with live screenshots and real ADB metadata (model, manufacturer, IP, OS, serial, product)
- Device page summary with online/offline counts, last refresh time, and manual refresh
- Independent refresh: device list every 1s, screenshots every 5s; keeps previous frame without loading animation
- Configurable device list and screenshot intervals in Settings (default 1s / 5s)
- Device screenshot endpoint: `GET /api/devices/:serial/screenshot`
- Device list endpoint: `GET /api/devices` (name, IP, model, and more)
- scrcpy source vendored in `backend/source/scrcpy`; backend session API `/api/scrcpy/*`
- Cross-platform scrcpy build/sync scripts: `tools/build-scrcpy.mjs`, `tools/sync-scrcpy-source.mjs`
- Query connected devices and basic device properties through the bundled ADB
- Root `npm run dev` starts backend first, waits for `/health`, then starts the frontend
- Vite dev proxy for `/api` with backend health check and clearer connection errors
- Light/dark theme toggle at bottom-left with persisted preference
- ui-ux-pro-max design refresh: glass cards, SVG icons, improved typography
- `.cursor/skills` includes ui-ux-pro-max design skill for Cursor
- Sync frontend and backend versions to `0.3.7`

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
