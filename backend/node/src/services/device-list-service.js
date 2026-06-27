import { rememberDevicePlatforms } from "./device-platform-registry.js";
import { listDevices as listAndroidDevices } from "./adb-service.js";
import { listHarmonyDevices } from "./harmony-device.js";
import { getHostRuntimeInfo } from "../config/runtime-env.js";
import { getHostNetworkSummary } from "../utils/host-networks.js";

export async function listAllDevices() {
  const [androidResult, harmonyResult] = await Promise.all([
    listAndroidDevices().catch(() => ({ adbPath: null, devices: [] })),
    listHarmonyDevices().catch(() => ({ hdcPath: null, devices: [] })),
  ]);

  const androidDevices = (androidResult.devices ?? []).map((device) => ({
    ...device,
    platform: "android",
  }));
  const harmonyDevices = harmonyResult.devices ?? [];
  const devices = [...androidDevices, ...harmonyDevices];

  rememberDevicePlatforms(devices);

  return {
    adbPath: androidResult.adbPath ?? null,
    hdcPath: harmonyResult.hdcPath ?? null,
    host: getHostRuntimeInfo(),
    network: getHostNetworkSummary(),
    total: devices.length,
    devices,
  };
}
