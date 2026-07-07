import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

import {
  WDA_BIN_DIR,
  WDA_IPA_PATH,
  WDA_PIPELINE_SCRIPT,
  WDA_SIGNED_DIR,
  getWdaPrepareStatus,
  readWdaConfig,
  resolveZsignPath,
} from "../../../config/ios-wda-paths.js";
import { connectIosDevice } from "../ios-device.js";
import { getPythonCommand } from "../pymobile-exec.js";
import {
  appendWdaPipelineLog,
  createWdaPipelineJob,
  getWdaPipelineJob,
  updateWdaPipelineJob,
} from "./job-store.js";

const STEP_ORDER = ["prepare", "login", "sign", "install", "discover", "connect"];
const STEP_PROGRESS = {
  prepare: 10,
  login: 25,
  sign: 55,
  install: 75,
  discover: 90,
  connect: 100,
};

function parseProgressLine(line, jobId) {
  try {
    return JSON.parse(line);
  } catch {
    appendWdaPipelineLog(jobId, { level: "debug", message: line });
    return null;
  }
}

function applyPipelineEvent(jobId, event) {
  if (!event?.step) {
    return;
  }

  const progress = typeof event.progress === "number" ? event.progress : STEP_PROGRESS[event.step] ?? 0;
  const status = event.status === "error" ? "error" : event.status === "done" ? "running" : "running";

  if (event.status === "error") {
    updateWdaPipelineJob(jobId, {
      status: "error",
      step: event.step,
      progress,
      message: event.message,
      error: event.message,
      code: event.error ?? event.code ?? `${event.step}_failed`,
    });
    appendWdaPipelineLog(jobId, { level: "error", step: event.step, message: event.message });
    return;
  }

  updateWdaPipelineJob(jobId, {
    status: event.step === "connect" && event.status === "done" ? "completed" : "running",
    step: event.step,
    progress,
    message: event.message,
    error: null,
    code: null,
    result: event.result ?? null,
  });
  appendWdaPipelineLog(jobId, { level: "info", step: event.step, message: event.message });
}

export function getWdaPrepareReport() {
  const status = getWdaPrepareStatus();

  return {
    ...status,
    certsDir: path.resolve(WDA_BIN_DIR, "certs"),
    certsDirExists: fs.existsSync(path.resolve(WDA_BIN_DIR, "certs")),
  };
}

export async function startWdaPipeline(input = {}) {
  const prepare = getWdaPrepareReport();
  const config = readWdaConfig();

  if (!prepare.ipaExists && !(Boolean(input.skipInstall) && Boolean(input.skipSign))) {
    const error = new Error(`未找到 WDA IPA，请将文件放到 ${WDA_IPA_PATH}`);
    error.code = "wda_ipa_missing";
    throw error;
  }

  if (!prepare.pipelineExists) {
    const error = new Error("WDA 安装脚本缺失。");
    error.code = "wda_pipeline_missing";
    throw error;
  }

  const job = createWdaPipelineJob({
    skipInstall: Boolean(input.skipInstall),
    skipSign: Boolean(input.skipSign),
    udid: input.udid ?? null,
  });

  const pythonConfig = {
    ipaPath: WDA_IPA_PATH,
    signedDir: WDA_SIGNED_DIR,
    zsignPath: resolveZsignPath(),
    certsDir: path.resolve(WDA_BIN_DIR, "certs"),
    bundleId: config.bundleId,
    httpPort: config.httpPort,
    mjpegPort: config.mjpegPort,
    appleId: input.appleId ?? "",
    password: input.password ?? "",
    skipInstall: Boolean(input.skipInstall),
    skipSign: Boolean(input.skipSign),
    udid: input.udid ?? null,
  };

  const python = getPythonCommand();
  const child = spawn(python, [WDA_PIPELINE_SCRIPT], {
    cwd: path.dirname(WDA_PIPELINE_SCRIPT),
    env: process.env,
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"],
  });

  job.child = child;
  updateWdaPipelineJob(job.id, {
    status: "running",
    step: "prepare",
    progress: 0,
    message: "正在启动 WDA 流水线…",
  });

  child.stdin.write(`${JSON.stringify(pythonConfig)}\n`);
  child.stdin.end();

  let stdoutBuffer = "";

  child.stdout.on("data", (chunk) => {
    stdoutBuffer += String(chunk);

    while (true) {
      const newlineIndex = stdoutBuffer.indexOf("\n");

      if (newlineIndex < 0) {
        break;
      }

      const line = stdoutBuffer.slice(0, newlineIndex).trim();
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);

      if (!line) {
        continue;
      }

      const event = parseProgressLine(line, job.id);

      if (event) {
        applyPipelineEvent(job.id, event);
      }
    }
  });

  child.stderr.on("data", (chunk) => {
    const message = String(chunk).trim();

    if (message) {
      appendWdaPipelineLog(job.id, { level: "stderr", message });
    }
  });

  child.on("close", async (code) => {
    const current = getWdaPipelineJob(job.id);

    if (!current) {
      return;
    }

    current.child = null;

    if (current.status === "error") {
      return;
    }

    if (code !== 0) {
      updateWdaPipelineJob(job.id, {
        status: "error",
        error: current.message || "WDA 流水线异常退出",
        code: "wda_pipeline_failed",
      });
      return;
    }

    if (current.result?.host) {
      try {
        const device = await connectIosDevice({
          host: current.result.host,
          httpPort: current.result.httpPort,
          mjpegPort: current.result.mjpegPort,
          udid: current.result.udid,
          name: current.result.deviceName,
          source: "usb-pipeline",
        });

        updateWdaPipelineJob(job.id, {
          status: "completed",
          step: "connect",
          progress: 100,
          message: "设备连接成功",
          result: {
            ...current.result,
            device,
          },
        });
      } catch (error) {
        updateWdaPipelineJob(job.id, {
          status: "error",
          step: "connect",
          progress: 100,
          message: error instanceof Error ? error.message : "设备注册失败",
          error: error instanceof Error ? error.message : "connect_failed",
          code: "ios_connect_failed",
        });
      }

      return;
    }

    updateWdaPipelineJob(job.id, {
      status: "completed",
      step: "connect",
      progress: 100,
      message: "流水线完成",
    });
  });

  return job;
}

export function getWdaPipelineSteps() {
  return STEP_ORDER.map((id) => ({
    id,
    progress: STEP_PROGRESS[id],
  }));
}
