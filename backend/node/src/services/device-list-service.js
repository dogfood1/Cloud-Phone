import { rememberDevicePlatforms } from "./device-platform-registry.js";
import { listDevices as listAndroidDevices } from "./adb-service.js";
import { listHarmonyDevices } from "./harmony-device.js";
import { listIosDevices } from "./ios/ios-device.js";
import { getHostRuntimeInfo } from "../config/runtime-env.js";
import { getHostNetworkSummary } from "../utils/host-networks.js";

export async function listAllDevices() {
  const [androidResult, harmonyResult, iosDevices] = await Promise.all([
    listAndroidDevices().catch(() => ({ adbPath: null, devices: [] })),
    listHarmonyDevices().catch(() => ({ hdcPath: null, devices: [] })),
    listIosDevices().catch(() => []),
  ]);

  const androidDevices = (androidResult.devices ?? []).map((device) => ({
    ...device,
    platform: "android",
  }));
  const harmonyDevices = harmonyResult.devices ?? [];
  const devices = [...androidDevices, ...harmonyDevices, ...iosDevices];

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
