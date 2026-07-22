import { logDebug, logError, logInfo, logWarn } from "./app-event-logger.js";

function inferStreamLogLevel(message) {
  if (/失败|错误|error|超时|timeout/i.test(message)) {
    return "error";
  }

  if (/警告|warn|未就绪|不支持/i.test(message)) {
    return "warn";
  }

  if (/首帧|已连接|成功|完成|已渲染|已响应|尺寸/i.test(message)) {
    return "info";
  }

  return "debug";
}

export function bridgeCastStreamLog(message, options = {}) {
  if (!message) {
    return;
  }

  const level = inferStreamLogLevel(message);
  const logOptions = {
    details: {
      source: options.source ?? "cast-startup-log",
      castType: options.castType ?? "unknown",
    },
    deviceSerial: options.deviceSerial ?? null,
    deviceName: options.deviceName ?? null,
  };

  if (level === "error") {
    logError("stream", "cast.stream.line", message, logOptions);
    return;
  }

  if (level === "warn") {
    logWarn("stream", "cast.stream.line", message, logOptions);
    return;
  }

  if (level === "info") {
    logInfo("stream", "cast.stream.line", message, logOptions);
    return;
  }

  logDebug("stream", "cast.stream.line", message, logOptions);
}
