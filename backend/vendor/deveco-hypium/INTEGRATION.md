# DevEco Testing Hypium 6.1.0.210（参考文档）

本目录存放从 `devecotesting-hypium-6.1.0.210` 提取的 API 文档，供 Cloud-Phone 鸿蒙投屏/自动化集成对照。

## 目录

| 路径 | 说明 |
|------|------|
| `hypium-6.1.0.210/readme.md` | pip 安装顺序（xdevice → hypium） |
| `hypium-6.1.0.210/CHANGELOG.txt` | 版本变更；5.0.3.100 注明 uitest agent 与投屏插件冲突 |
| `hypium-6.1.0.210/doc/hypium_api_6.1.0.210.md` | Python UiDriver API |
| `hypium-driver-js-6.1.0210/api_reference.md` | Node hypium-driver API |

## Cloud-Phone 鸿蒙投屏实现要点

- **连接工具**：HDC（非 ADB），默认服务端口 8710
- **设备 Agent**：`agent.so` + `uitest start-daemon singleness`
- **端口转发**：`hdc fport tcp:<local> tcp:8012`
- **实时画面**：uitest `Captures.startCaptureScreen` → JPEG 流（非 H.264）
- **触控**：Hypium RPC `Gestures.touchDown` / `touchMove` / `touchUp`（ECHO/hdckit 实时拖动）；`Driver.click` / `Driver.swipe` 仍可用于单次操作

运行时资源：

- `backend/bin/hdc/<platform>/` — HDC 可执行文件
- `backend/assets/harmony/uitest_agent_v1.1.0.so` — uitest agent（可从 hmdriver2 或 DevEco SDK 获取）

实现代码：`backend/node/src/services/hdc/`、`harmony-cast/`、`harmony-device.js`
