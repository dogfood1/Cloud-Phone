import http from "node:http";

export function createApp() {
  return http.createServer((req, res) => {
    const { method, url } = req;

    if (method === "GET" && url === "/health") {
      const body = JSON.stringify({
        status: "ok",
        service: "cloud-phone-node",
        version: "0.1.0",
      });

      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(body);
      return;
    }

    if (method === "GET" && url === "/") {
      const body = JSON.stringify({
        name: "cloud-phone-node",
        version: "0.1.0",
        message: "Cloud Phone backend is ready.",
      });

      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(body);
      return;
    }

    const body = JSON.stringify({
      error: "Not Found",
    });

    res.writeHead(404, {
      "Content-Type": "application/json; charset=utf-8",
    });
    res.end(body);
  });
}
