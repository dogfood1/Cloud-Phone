/**
 * @param {import("./uitest-rpc.js").UitestRpcClient} rpc
 * @param {{ type: string, x?: number, y?: number, x1?: number, y1?: number, x2?: number, y2?: number, speed?: number }} message
 */
export async function handleHarmonyTouchMessage(rpc, message) {
  const type = String(message?.type ?? "").toLowerCase();

  if (type === "click" || type === "tap") {
    await rpc.invoke("Driver.click", [{ x: message.x, y: message.y }]);
    return;
  }

  if (type === "doubleclick" || type === "double_click") {
    await rpc.invoke("Driver.doubleClick", [{ x: message.x, y: message.y }]);
    return;
  }

  if (type === "longclick" || type === "long_click") {
    await rpc.invoke("Driver.longClick", [{ x: message.x, y: message.y }]);
    return;
  }

  if (type === "swipe") {
    const speed = Number(message.speed ?? 300);
    await rpc.invoke("Driver.swipe", [
      { x: message.x1, y: message.y1 },
      { x: message.x2, y: message.y2 },
      speed,
    ]);
  }
}
