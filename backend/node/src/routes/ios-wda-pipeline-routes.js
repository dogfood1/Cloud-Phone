import { APP_VERSION } from "../config/version.js";
import {
  checkPymobiledevice3,
  checkPythonRuntime,
  getIosPythonHints,
} from "../services/ios/pymobile-exec.js";
import {
  getWdaPipelineJob,
  getWdaPipelineSteps,
  getWdaPrepareReport,
  serializeWdaPipelineJob,
  startWdaPipeline,
} from "../services/ios/wda-pipeline/runner.js";
import { readProtectedJsonBody, sendProtectedJson } from "../utils/protected-http.js";

export async function handleIosWdaPipelineRoute(req, res, method, pathname) {
  if (method === "GET" && pathname === "/api/devices/ios/wda/prepare") {
    const [python, pymobile] = await Promise.all([checkPythonRuntime(), checkPymobiledevice3()]);

    sendProtectedJson(res, 200, {
      success: true,
      version: APP_VERSION,
      prepare: getWdaPrepareReport(),
      python,
      pymobiledevice3: pymobile,
      hints: getIosPythonHints(),
      steps: getWdaPipelineSteps(),
    });
    return true;
  }

  if (method === "POST" && pathname === "/api/devices/ios/wda/pipeline") {
    try {
      const body = await readProtectedJsonBody(req, res);
      const job = await startWdaPipeline(body ?? {});

      sendProtectedJson(res, 200, {
        success: true,
        version: APP_VERSION,
        job: serializeWdaPipelineJob(job),
      });
    } catch (error) {
      sendProtectedJson(res, 400, {
        success: false,
        version: APP_VERSION,
        error: error?.code ?? "wda_pipeline_start_failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return true;
  }

  const statusMatch = pathname.match(/^\/api\/devices\/ios\/wda\/pipeline\/([^/]+)$/);

  if (method === "GET" && statusMatch) {
    const job = getWdaPipelineJob(decodeURIComponent(statusMatch[1]));

    if (!job) {
      sendProtectedJson(res, 404, {
        success: false,
        version: APP_VERSION,
        error: "wda_pipeline_not_found",
        message: "Pipeline job not found.",
      });
      return true;
    }

    sendProtectedJson(res, 200, {
      success: true,
      version: APP_VERSION,
      job: serializeWdaPipelineJob(job),
    });
    return true;
  }

  return false;
}
