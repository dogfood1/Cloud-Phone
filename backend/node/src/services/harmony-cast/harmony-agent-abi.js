import { readFile } from "node:fs/promises";

const EM_X86_64 = 62;
const EM_AARCH64 = 183;

const ABI_LABELS = {
  [EM_X86_64]: "x86_64",
  [EM_AARCH64]: "arm64",
};

/**
 * @param {string} filePath
 */
export async function readAgentMachine(filePath) {
  const header = await readFile(filePath, { start: 0, end: 64 });

  if (header.length < 20 || header[0] !== 0x7f || header.toString("ascii", 1, 4) !== "ELF") {
    throw new Error("Harmony uitest agent is not a valid ELF file.");
  }

  return header.readUInt16LE(18);
}

export function machineToAbiLabel(machine) {
  return ABI_LABELS[machine] ?? `elf-${machine}`;
}

export function normalizeDeviceAbi(raw) {
  const value = String(raw ?? "").trim().toLowerCase();

  if (!value || /fail|error|unknown/i.test(value)) {
    return "";
  }

  if (value.includes("x86_64")) {
    return "x86_64";
  }

  if (value.includes("arm64") || value.includes("aarch64")) {
    return "arm64";
  }

  return value.split(/[,\s]+/)[0] ?? "";
}

export async function readHarmonyDeviceAbi(serial, runHdc) {
  const keys = ["const.product.cpu.abilist", "const.product.cpu.abi"];

  for (const key of keys) {
    try {
      const { stdout } = await runHdc(["shell", `param get ${key}`], { serial, timeout: 5000 });
      const abi = normalizeDeviceAbi(stdout.split(/\r?\n/)[0]);

      if (abi) {
        return abi;
      }
    } catch {
      // try next key
    }
  }

  return "";
}

/**
 * @param {string} deviceAbi
 * @param {number} agentMachine
 */
export function isAgentCompatibleWithDevice(deviceAbi, agentMachine) {
  const agentAbi = machineToAbiLabel(agentMachine);

  if (!deviceAbi) {
    return true;
  }

  if (deviceAbi === "x86_64") {
    return agentMachine === EM_X86_64;
  }

  if (deviceAbi === "arm64") {
    return agentMachine === EM_AARCH64;
  }

  return deviceAbi.includes(agentAbi);
}

export function buildAgentAbiMismatchMessage(deviceAbi, agentMachine) {
  const agentAbi = machineToAbiLabel(agentMachine);
  return (
    `uitest agent 架构不匹配：设备为 ${deviceAbi}，当前 agent 为 ${agentAbi}。` +
    "请放置与设备 CPU 架构一致的 uitest agent（x86_64 模拟器需 x86_64 版 agent，真机一般为 arm64）。"
  );
}
