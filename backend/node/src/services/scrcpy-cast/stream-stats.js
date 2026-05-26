import { logCastInfo } from "./cast-logger.js";

const SUMMARY_INTERVAL_MS = 5000;

export function createStreamStats() {
  return {
    startedAt: null,
    bytesReceived: 0,
    bytesForwarded: 0,
    frameCount: 0,
    keyFrameCount: 0,
    configCount: 0,
    lastFrameAt: null,
    streamInfoLogged: false,
    lastSummaryAt: 0,
    connectedAt: null,
    videoWidth: null,
    videoHeight: null,
  };
}

export function markStreamConnected(stats) {
  const now = Date.now();
  stats.connectedAt = now;
  stats.startedAt = now;
  stats.lastSummaryAt = now;
}

export function summarizeStreamStats(stats) {
  if (!stats) {
    return null;
  }

  const elapsedMs = stats.startedAt ? Date.now() - stats.startedAt : 0;
  const seconds = Math.max(elapsedMs / 1000, 0.001);
  const bitrateKbps = Math.round((stats.bytesReceived * 8) / seconds / 1000);

  return {
    connectedAt: stats.connectedAt,
    elapsedMs: Math.round(elapsedMs),
    bytesReceived: stats.bytesReceived,
    bytesForwarded: stats.bytesForwarded,
    frameCount: stats.frameCount,
    keyFrameCount: stats.keyFrameCount,
    configCount: stats.configCount,
    bitrateKbps,
    videoWidth: stats.videoWidth,
    videoHeight: stats.videoHeight,
    lastFrameAt: stats.lastFrameAt,
  };
}

export function recordStreamSession(stats, videoSession) {
  stats.videoWidth = videoSession.width;
  stats.videoHeight = videoSession.height;
  stats.streamInfoLogged = true;
}

export function recordRawBytes(stats, bytes) {
  stats.bytesReceived += bytes;
}

export function recordConfigPacket(stats) {
  stats.configCount += 1;
}

export function recordMediaFrame(serial, session, payload, meta) {
  const stats = session.streamStats;
  const now = Date.now();

  stats.frameCount += 1;
  stats.lastFrameAt = now;

  if (meta.key) {
    stats.keyFrameCount += 1;
  }

  if (now - stats.lastSummaryAt >= SUMMARY_INTERVAL_MS) {
    stats.lastSummaryAt = now;
    logCastInfo(serial, "video.throughput", {
      ...summarizeStreamStats(stats),
      wsClients: session.clients.size,
      streaming: session.streaming,
    });
  }
}

export function recordForwardedBytes(stats, bytes) {
  stats.bytesForwarded += bytes;
}

export function logStreamStopped(serial, session, reason) {
  logCastInfo(serial, "video.stopped", {
    reason,
    ...summarizeStreamStats(session.streamStats),
    wsClients: session.clients.size,
  });
}
