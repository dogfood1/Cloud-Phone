export class HarmonyJpegPlayer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = 0;
    this.height = 0;
  }

  /**
   * @param {ArrayBuffer | Uint8Array} data
   */
  async pushFrame(data) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const blob = new Blob([bytes], { type: "image/jpeg" });
    const bitmap = await createImageBitmap(blob);

    if (this.canvas.width !== bitmap.width || this.canvas.height !== bitmap.height) {
      this.canvas.width = bitmap.width;
      this.canvas.height = bitmap.height;
      this.width = bitmap.width;
      this.height = bitmap.height;
    }

    this.ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
  }
}
