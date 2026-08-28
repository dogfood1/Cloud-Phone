import { requestJson } from "./api.js";

export function fetchRedroidStatus() {
  return requestJson("/api/redroid/status");
}

export function fetchRedroidModelBrands(options = {}) {
  const params = new URLSearchParams();
  if (options.refresh) {
    params.set("refresh", "1");
  }

  const suffix = params.toString() ? `?${params}` : "";
  return requestJson(`/api/redroid/brands${suffix}`);
}

export function fetchRedroidModels(options = {}) {
  const params = new URLSearchParams();
  if (options.query) {
    params.set("q", options.query);
  }
  if (options.brand) {
    params.set("brand", options.brand);
  }
  if (options.source) {
    params.set("source", options.source);
  }
  if (options.limit) {
    params.set("limit", String(options.limit));
  }
  if (options.refresh) {
    params.set("refresh", "1");
  }

  const suffix = params.toString() ? `?${params}` : "";
  return requestJson(`/api/redroid/models${suffix}`);
}

export function createRedroidInstance(payload) {
  return requestJson("/api/redroid/instances", {
    method: "POST",
    body: payload,
  });
}

export function startRedroidInstance(name) {
  return requestJson(`/api/redroid/instances/${encodeURIComponent(name)}/start`, {
    method: "POST",
  });
}

export function stopRedroidInstance(name) {
  return requestJson(`/api/redroid/instances/${encodeURIComponent(name)}/stop`, {
    method: "POST",
  });
}

export function deleteRedroidInstance(name, options = {}) {
  return requestJson(`/api/redroid/instances/${encodeURIComponent(name)}`, {
    method: "DELETE",
    body: {
      removeData: Boolean(options.removeData),
    },
  });
}

export function updateRedroidInstanceProxy(name, payload) {
  return requestJson(`/api/redroid/instances/${encodeURIComponent(name)}/proxy`, {
    method: "POST",
    body: payload,
  });
}

export function disableRedroidInstanceProxy(name) {
  return requestJson(`/api/redroid/instances/${encodeURIComponent(name)}/proxy`, {
    method: "DELETE",
  });
}

export function checkRedroidInstanceProxy(name) {
  return requestJson(`/api/redroid/instances/${encodeURIComponent(name)}/proxy/check`, {
    method: "POST",
  });
}

export function updateRedroidCameraImage(payload) {
  return requestJson("/api/redroid/camera-image", {
    method: "POST",
    body: payload,
  });
}
