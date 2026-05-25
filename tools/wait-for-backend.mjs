import http from "node:http";

export function waitForBackend(origin, options = {}) {
  const maxAttempts = options.maxAttempts ?? 60;
  const intervalMs = options.intervalMs ?? 500;

  return new Promise((resolve, reject) => {
    let attempts = 0;

    const tryOnce = () => {
      const request = http.get(`${origin}/health`, (response) => {
        response.resume();

        if (response.statusCode === 200) {
          resolve();
          return;
        }

        scheduleRetry();
      });

      request.on("error", scheduleRetry);
      request.setTimeout(2000, () => {
        request.destroy();
        scheduleRetry();
      });
    };

    const scheduleRetry = () => {
      attempts += 1;

      if (attempts >= maxAttempts) {
        reject(
          new Error(
            `Backend not ready at ${origin} after ${Math.round(
              (maxAttempts * intervalMs) / 1000,
            )}s. Start it with: npm run dev:backend`,
          ),
        );
        return;
      }

      setTimeout(tryOnce, intervalMs);
    };

    tryOnce();
  });
}
