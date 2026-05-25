# Cloud Phone

## 中文

### 项目简介
Cloud Phone 是一个前后端分离的云手机项目仓库。后端提供 API 与设备查询，前端独立运行并通过代理访问后端。

### 当前功能
- 初始化 Node.js 后端目录：`backend/node`（仅 `/health`、`/api/*`）
- 前端独立服务：`frontend/web`（静态页面 + `/api` 代理）
- 根目录 `.env` 配置 `BACKEND_PORT`、`FRONTEND_PORT`
- 修复首次改密流程：须先登录默认密码再修改，避免误报当前密码错误
- 提供设备查询接口：`GET /api/devices`
- 通过内置 ADB 查询连接设备与设备基础信息
- 根目录 `npm run dev:backend` / `npm run dev:frontend` 分别启动前后端
- 同步前端与后端版本号到 `0.2.3`

### 启动方式
```powershell
# 终端 1：后端 API（默认 3000）
cd backend/node && npm run dev

# 终端 2：前端（默认 5173，浏览器访问此端口）
cd frontend/web && npm install && npm run dev
```

## English

### Overview
Cloud Phone is a separated frontend/backend repository for a cloud phone project. The backend exposes APIs and device discovery; the frontend runs independently and proxies API requests.

### Current Features
- Node.js backend workspace in `backend/node` (`/health` and `/api/*` only)
- Standalone frontend server in `frontend/web` (static assets + `/api` proxy)
- Root `.env` for `BACKEND_PORT` and `FRONTEND_PORT`
- Fix first-time password change flow: login with default password before change
- Device query endpoint: `GET /api/devices`
- Query connected devices and basic device properties through the bundled ADB
- Root scripts `npm run dev:backend` and `npm run dev:frontend`
- Sync frontend and backend versions to `0.2.3`

### Getting Started
```powershell
# Terminal 1: backend API (default port 3000)
cd backend/node && npm run dev

# Terminal 2: frontend (default port 5173 — open this in the browser)
cd frontend/web && npm install && npm run dev
```
