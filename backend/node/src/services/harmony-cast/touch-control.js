/**
 * @param {import("./uitest-rpc.js").UitestRpcClient} rpc
 * @param {{ type: string, x?: number, y?: number, x1?: number, y1?: number, x2?: number, y2?: number, speed?: number }} message
 */
export async function handleHarmonyTouchMessage(rpc, message) {
  const type = String(message?.type ?? "").toLowerCase();

  if (type === "click" || type === "tap") {
    await rpc.invoke("Driver.click", [message.x, message.y]);
    return;
  }

  if (type === "doubleclick" || type === "double_click") {
    await rpc.invoke("Driver.doubleClick", [message.x, message.y]);
    return;
  }

  if (type === "longclick" || type === "long_click") {
    await rpc.invoke("Driver.longClick", [message.x, message.y]);
    return;
  }

  if (type === "swipe") {
    const speed = Number(message.speed ?? 2000);
    await rpc.invoke("Driver.swipe", [
      message.x1,
      message.y1,
      message.x2,
      message.y2,
      speed,
    ]);
  }
}
