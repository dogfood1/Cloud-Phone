import { captureDeviceScreenshot } from "./device-screenshot.js";

const FRAME_BOUNDARY = "frame";
const FRAME_INTERVAL_MS = 150;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function streamDeviceCast(req, res, serial) {
  let closed = false;

  const close = () => {
    closed = true;
  };

  req.on("close", close);
  res.on("close", close);

  res.writeHead(200, {
    "Content-Type": `multipart/x-mixed-replace; boundary=${FRAME_BOUNDARY}`,
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Connection: "close",
    Pragma: "no-cache",
  });

  void pumpFrames(res, serial, close);
}

async function pumpFrames(res, serial, isClosed) {
  let consecutiveErrors = 0;

  while (!isClosed()) {
    try {
      const frame = await captureDeviceScreenshot(serial);
      consecutiveErrors = 0;

      if (isClosed()) {
        break;
      }

      res.write(`--${FRAME_BOUNDARY}\r\n`);
      res.write("Content-Type: image/png\r\n");
      res.write(`Content-Length: ${frame.length}\r\n\r\n`);
      res.write(frame);
      res.write("\r\n");
    } catch {
      consecutiveErrors += 1;

      if (consecutiveErrors >= 5) {
        break;
      }
    }

    await delay(FRAME_INTERVAL_MS);
  }

  if (!res.writableEnded) {
    res.end();
  }
}
