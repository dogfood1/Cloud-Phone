import {
  createRedroidInstance,
  deleteRedroidInstance,
  findNextAdbPort,
  getRedroidCameraStatus,
  getRedroidRuntimeConfig,
  listRedroidInstances,
  setRedroidCameraImage,
  startRedroidInstance,
  stopRedroidInstance,
} from "../services/redroid-service.js";
import { listRedroidModelPresets } from "../services/redroid-models-service.js";
import { readProtectedJsonBody, sendProtectedJson } from "../utils/protected-http.js";

function sendError(res, error) {
  sendProtectedJson(res, error?.statusCode ?? 500, {
    success: false,
    error: error?.code ?? "redroid_request_failed",
    message: error instanceof Error ? error.message : "Unknown ReDroid error.",
  });
}

export async function handleRedroidRoute(req, res, method, pathname, requestUrl) {
  if (!pathname.startsWith("/api/redroid")) {
    return false;
  }

  try {
    if (method === "GET" && pathname === "/api/redroid/status") {
      const [instances, camera, nextAdbPort] = await Promise.all([
        listRedroidInstances(),
        getRedroidCameraStatus(),
        findNextAdbPort(),
      ]);

      sendProtectedJson(res, 200, {
        success: true,
        config: getRedroidRuntimeConfig(),
        nextAdbPort,
        camera,
        instances,
      });
      return true;
    }

    if (method === "GET" && pathname === "/api/redroid/models") {
      const result = await listRedroidModelPresets({
        query: requestUrl.searchParams.get("q") ?? "",
        brand: requestUrl.searchParams.get("brand") ?? "",
        limit: Number(requestUrl.searchParams.get("limit") ?? 80),
        refresh: requestUrl.searchParams.get("refresh") === "1",
      });

      sendProtectedJson(res, 200, {
        success: true,
        ...result,
      });
      return true;
    }

    if (method === "GET" && pathname === "/api/redroid/instances") {
      sendProtectedJson(res, 200, {
        success: true,
        instances: await listRedroidInstances(),
      });
      return true;
    }

    if (method === "POST" && pathname === "/api/redroid/instances") {
      const body = await readProtectedJsonBody(req, res);
      const result = await createRedroidInstance(body);

      sendProtectedJson(res, 201, {
        success: true,
        ...result,
      });
      return true;
    }

    const actionMatch = pathname.match(/^\/api\/redroid\/instances\/([^/]+)\/(start|stop)$/);
    if (method === "POST" && actionMatch) {
      const name = decodeURIComponent(actionMatch[1]);
      const action = actionMatch[2];
      const result =
        action === "start"
          ? await startRedroidInstance(name)
          : await stopRedroidInstance(name);

      sendProtectedJson(res, 200, {
        success: true,
        action,
        ...result,
      });
      return true;
    }

    const deleteMatch = pathname.match(/^\/api\/redroid\/instances\/([^/]+)$/);
    if (method === "DELETE" && deleteMatch) {
      const body = await readProtectedJsonBody(req, res).catch(() => ({}));
      const result = await deleteRedroidInstance(decodeURIComponent(deleteMatch[1]), {
        removeData:
          body.removeData === true || requestUrl.searchParams.get("removeData") === "1",
      });

      sendProtectedJson(res, 200, {
        success: true,
        ...result,
      });
      return true;
    }

    if (method === "POST" && pathname === "/api/redroid/camera-image") {
      const body = await readProtectedJsonBody(req, res);
      const result = await setRedroidCameraImage(body);

      sendProtectedJson(res, 200, {
        success: true,
        ...result,
      });
      return true;
    }

    sendProtectedJson(res, 404, {
      success: false,
      error: "redroid_not_found",
    });
    return true;
  } catch (error) {
    sendError(res, error);
    return true;
  }
}
