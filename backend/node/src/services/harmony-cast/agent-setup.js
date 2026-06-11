import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  HARMONY_AGENT_REMOTE_PATH,
  UITEST_SERVICE_PORT,
  pickHarmonyLocalPort,
  resolveHarmonyAgentPath,
} from "../../config/harmony-paths.js";
import { runHdc } from "../hdc/hdc-exec.js";
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

export async function setupHarmonyUitestAgent(serial) {
  const localAgentPath = resolveHarmonyAgentPath();
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
  await runHdc(["shell", "uitest start-daemon singleness"], { serial, timeout: 10_000 });
  await delay(500);

  logHarmonyCastInfo(serial, "uitest.agent.ready", { remote: HARMONY_AGENT_REMOTE_PATH });
}

export async function forwardHarmonyUitestPort(serial, localPort = pickHarmonyLocalPort()) {
  await runHdc(["fport", `tcp:${localPort}`, `tcp:${UITEST_SERVICE_PORT}`], {
    serial,
    timeout: 8000,
  });

  logHarmonyCastInfo(serial, "uitest.fport.ready", {
    localPort,
    remotePort: UITEST_SERVICE_PORT,
  });

  return localPort;
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
