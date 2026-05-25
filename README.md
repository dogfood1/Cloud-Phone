# Cloud Phone

## 中文

### 项目简介
Cloud Phone 是一个前后端分离的云手机项目仓库。后端提供 API 与设备查询，前端基于 Vue 3 + Vite 构建，通过代理访问后端。

### 当前功能
- 初始化 Node.js 后端目录：`backend/node`（仅 `/health`、`/api/*`）
- 前端 Vue 3 工程：`frontend/web`（Vite 开发、构建产物 `dist/`）
- 根目录 `.env` 配置 `BACKEND_PORT`、`FRONTEND_PORT`
- 左侧 Tab：控制台概览、设备画廊、设置
- 设备画廊展示实时截图、设备名称与 IP 地址
- 设置页可配置截图刷新间隔（默认 5 秒）
- 设备截图接口：`GET /api/devices/:serial/screenshot`
- 设备列表接口：`GET /api/devices`（含名称、IP、型号等）
- 通过内置 ADB 查询连接设备与设备基础信息
- 根目录 `npm run dev` 一键启动前后端
- 左下角浅色/深色主题切换，偏好本地保存
- 同步前端与后端版本号到 `0.3.1`

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
- Left sidebar tabs: Console overview, Devices gallery, Settings
- Device gallery cards with live screenshots, device name, and IP address
- Configurable screenshot refresh interval in Settings (default 5 seconds)
- Device screenshot endpoint: `GET /api/devices/:serial/screenshot`
- Device list endpoint: `GET /api/devices` (name, IP, model, and more)
- Query connected devices and basic device properties through the bundled ADB
- Root `npm run dev` starts backend and frontend together
- Light/dark theme toggle at bottom-left with persisted preference
- Sync frontend and backend versions to `0.3.1`

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
