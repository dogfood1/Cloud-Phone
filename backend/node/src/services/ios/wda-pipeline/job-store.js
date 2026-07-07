import { randomUUID } from "node:crypto";

/** @type {Map<string, object>} */
const jobs = new Map();

export function createWdaPipelineJob(payload = {}) {
  const id = randomUUID();
  const job = {
    id,
    status: "pending",
    step: "prepare",
    progress: 0,
    message: "等待开始…",
    error: null,
    code: null,
    result: null,
    logs: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    input: payload,
    child: null,
  };

  jobs.set(id, job);
  return job;
}

export function getWdaPipelineJob(jobId) {
  return jobs.get(jobId) ?? null;
}

export function updateWdaPipelineJob(jobId, patch) {
  const job = jobs.get(jobId);

  if (!job) {
    return null;
  }

  Object.assign(job, patch, { updatedAt: Date.now() });
  return job;
}

export function appendWdaPipelineLog(jobId, entry) {
  const job = jobs.get(jobId);

  if (!job) {
    return;
  }

  job.logs.push({
    ...entry,
    at: Date.now(),
  });

  if (job.logs.length > 200) {
    job.logs.shift();
  }

  job.updatedAt = Date.now();
}

export function deleteWdaPipelineJob(jobId) {
  const job = jobs.get(jobId);

  if (job?.child) {
    try {
      job.child.kill("SIGTERM");
    } catch {
      // ignore
    }
  }

  jobs.delete(jobId);
}

export function serializeWdaPipelineJob(job) {
  if (!job) {
    return null;
  }

  return {
    id: job.id,
    status: job.status,
    step: job.step,
    progress: job.progress,
    message: job.message,
    error: job.error,
    code: job.code,
    result: job.result,
    logs: job.logs,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}
