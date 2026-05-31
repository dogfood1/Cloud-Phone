const MAX_LINES = 80;

function formatTime(date = new Date()) {
  return date.toLocaleTimeString("zh-CN", { hour12: false });
}

export function createCastStartupLog() {
  const lines = [];

  function reset(placeholder = "等待连接日志…") {
    lines.length = 0;
    if (placeholder) {
      lines.push(placeholder);
    }
  }

  function append(message) {
    if (!message) {
      return;
    }
    if (lines.length === 1 && lines[0] === "等待连接日志…") {
      lines.length = 0;
    }
    lines.push(`${formatTime()}  ${message}`);
    if (lines.length > MAX_LINES) {
      lines.splice(0, lines.length - MAX_LINES);
    }
  }

  function ingest(entries) {
    if (!Array.isArray(entries)) {
      return;
    }
    for (const entry of entries) {
      const message = entry?.message;
      if (message) {
        append(message);
      }
    }
  }

  function textValue() {
    return lines.join("\n");
  }

  return {
    reset,
    append,
    ingest,
    textValue,
    get lines() {
      return [...lines];
    },
  };
}
