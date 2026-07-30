import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  HARMONY_AGENT_REMOTE_PATH,
  UITEST_SERVICE_PORT,
  resolveHarmonyAgentPathForAbi,
} from "../../config/harmony-paths.js";
import { pickAvailableLocalPort } from "../local-port.js";
import { runHdc } from "../hdc/hdc-exec.js";
import {
  buildAgentAbiMismatchMessage,
  isAgentCompatibleWithDevice,
  readAgentMachine,
  readHarmonyDeviceAbi,
} from "./harmony-agent-abi.js";
import { logHarmonyCastInfo } from "./cast-logger.js";

async function localFileMd5(filePath) {
  const hash = createHash("md5");
  hash.update(await readFile(filePath));
  return hash.digest("hex");
}

async function remoteFileMd5(serial, remotePath) {
  try {
    const { stdout } = await runHdc(["shell", `md5sum ${remotePath}`], { serial, timeout: 8000 });
    return stdout.trim().split(/\s+/)[0] ?? "";
  } catch {
    return "";
  }
}

async function remoteFileExists(serial, remotePath) {
  try {
    const { stdout } = await runHdc(
      ["shell", `[ -f ${remotePath} ] && echo exists || echo missing`],
      { serial, timeout: 5000 },
    );
    return stdout.includes("exists");
  } catch {
    return false;
  }
}

async function killUitestDaemon(serial) {
  try {
    const { stdout } = await runHdc(["shell", "ps -ef"], { serial, timeout: 8000 });
    const pids = stdout
      .split(/\r?\n/)
      .filter((line) => line.includes("uitest") && line.includes("singleness"))
      .map((line) => line.trim().split(/\s+/)[1])
      .filter(Boolean);

    for (const pid of pids) {
      await runHdc(["shell", `kill -9 ${pid}`], { serial, timeout: 5000 }).catch(() => {});
    }
  } catch {
    // ignore
  }
}

async function isUitestDaemonRunning(serial) {
  try {
    const { stdout } = await runHdc(["shell", "ps -ef"], { serial, timeout: 8000 });
    return stdout
      .split(/\r?\n/)
      .some((line) => line.includes("uitest") && line.includes("start-daemon singleness"));
  } catch {
    return false;
  }
}

export async function setupHarmonyUitestAgent(serial) {
  const deviceAbi = await readHarmonyDeviceAbi(serial, runHdc);
  const localAgentPath = await resolveHarmonyAgentPathForAbi(deviceAbi, readAgentMachine);
  const agentMachine = await readAgentMachine(localAgentPath);

  if (!isAgentCompatibleWithDevice(deviceAbi, agentMachine)) {
    throw new Error(buildAgentAbiMismatchMessage(deviceAbi, agentMachine));
  }

  const localMd5 = await localFileMd5(localAgentPath);
  const exists = await remoteFileExists(serial, HARMONY_AGENT_REMOTE_PATH);
  const remoteMd5 = exists ? await remoteFileMd5(serial, HARMONY_AGENT_REMOTE_PATH) : "";

  await killUitestDaemon(serial);

  if (!exists || localMd5 !== remoteMd5) {
    if (exists) {
      await runHdc(["shell", `rm -f ${HARMONY_AGENT_REMOTE_PATH}`], { serial });
    }

    await runHdc(["file", "send", localAgentPath, HARMONY_AGENT_REMOTE_PATH], {
      serial,
      timeout: 30_000,
    });
  }

  await runHdc(["shell", `chmod +x ${HARMONY_AGENT_REMOTE_PATH}`], { serial });
  await runHdc(["shell", "param set persist.ace.testmode.enabled 1"], { serial, timeout: 8000 }).catch(
    () => {},
  );
  await runHdc(["shell", "uitest start-daemon singleness"], { serial, timeout: 10_000 });
  await delay(2000);

  if (!(await isUitestDaemonRunning(serial))) {
    throw new Error(
      deviceAbi
        ? `uitest 服务未启动（设备 ${deviceAbi}）。请确认 agent 架构正确且已开启测试模式。`
        : "uitest 服务未启动。请确认 agent 已推送且设备已开启开发者/测试模式。",
    );
  }

  logHarmonyCastInfo(serial, "uitest.agent.ready", {
    remote: HARMONY_AGENT_REMOTE_PATH,
    deviceAbi: deviceAbi || "unknown",
  });
}

export async function forwardHarmonyUitestPort(serial, localPort) {
  const port = localPort > 0 ? localPort : await pickAvailableLocalPort();
  await runHdc(["fport", `tcp:${port}`, `tcp:${UITEST_SERVICE_PORT}`], {
    serial,
    timeout: 8000,
  });

  logHarmonyCastInfo(serial, "uitest.fport.ready", {
    localPort: port,
    remotePort: UITEST_SERVICE_PORT,
  });

  return port;
}

export async function removeHarmonyUitestPort(serial, localPort) {
  await runHdc(["fport", "rm", `tcp:${localPort}`, `tcp:${UITEST_SERVICE_PORT}`], {
    serial,
    timeout: 5000,
  }).catch(() => {});
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
