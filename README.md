# Cloud Phone

## 中文

### 项目简介
Cloud Phone 是一个前后端分离的云手机项目仓库。当前已完成后端 Node.js 工程初始化，并提供基础设备查询能力。

### 当前功能
- 初始化 Node.js 后端目录：`backend/node`
- 提供基础 HTTP 服务与健康检查接口
- 提供设备查询接口：`GET /api/devices`
- 通过内置 ADB 查询连接设备与设备基础信息
- 提供统一的 npm 启动脚本
- 同步前端与后端版本号到 `0.2.0`

## English

### Overview
Cloud Phone is a separated frontend/backend repository for a cloud phone project. The backend Node.js workspace is initialized and now includes a basic device query capability.

### Current Features
- Initialize Node.js backend workspace in `backend/node`
- Provide a basic HTTP server and health check endpoint
- Provide a device query endpoint: `GET /api/devices`
- Query connected devices and basic device properties through the bundled ADB
- Provide unified npm scripts
- Sync frontend and backend versions to `0.2.0`
