import mdns from "multicast-dns";
import { encode } from "dns-packet";

import { pickLanIpv4 } from "../utils/host-networks.js";

function toTxtRecords(txt) {
  return Object.entries(txt)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      const safeValue = String(value);
      return Buffer.from(`${key}=${safeValue}`);
    });
}

function buildServiceRecords({ serviceName, serviceType, port, txt, ipv4 }) {
  const instance = `${serviceName}.${serviceType}`;
  const hostname = `cloud-phone-${port}.local`;

  return {
    ptr: { name: serviceType, type: "PTR", data: instance, ttl: 120 },
    srv: {
      name: instance,
      type: "SRV",
      data: { priority: 0, weight: 0, port, target: hostname },
      ttl: 120,
    },
    txt: { name: instance, type: "TXT", data: toTxtRecords(txt), ttl: 120 },
    a: { name: hostname, type: "A", data: ipv4, ttl: 120 },
  };
}

export function startMdnsService({ host, port, version, lanIpv4Addresses = [] }) {
  const ipv4 = pickLanIpv4(host);
  const mdnsServer = mdns();
  const lanList = [...new Set([ipv4, ...lanIpv4Addresses].filter(Boolean))];

  const cloudphone = buildServiceRecords({
    serviceName: `Cloud-Phone-${port}`,
    serviceType: "_cloudphone._tcp.local",
    port,
    ipv4,
    txt: {
      version,
      path: "/api/ping",
      lan: ipv4,
      lan_all: lanList.join(","),
      port,
    },
  });

  const http = buildServiceRecords({
    serviceName: `Cloud-Phone-HTTP-${port}`,
    serviceType: "_http._tcp.local",
    port,
    ipv4,
    txt: {
      version,
      path: "/api/ping",
      lan: ipv4,
      lan_all: lanList.join(","),
      port,
    },
  });

  function respond(query) {
    const q = query?.questions ?? [];
    const answers = [];

    for (const question of q) {
      if (!question?.name) continue;

      if (question.name === "_cloudphone._tcp.local" && question.type === "PTR") {
        answers.push(cloudphone.ptr, cloudphone.srv, cloudphone.txt, cloudphone.a);
      }

      if (question.name === "_http._tcp.local" && question.type === "PTR") {
        answers.push(http.ptr, http.srv, http.txt, http.a);
      }

      if (question.name === cloudphone.srv.name && (question.type === "SRV" || question.type === "ANY")) {
        answers.push(cloudphone.srv, cloudphone.txt, cloudphone.a);
      }

      if (question.name === http.srv.name && (question.type === "SRV" || question.type === "ANY")) {
        answers.push(http.srv, http.txt, http.a);
      }
    }

    if (answers.length === 0) {
      return;
    }

    mdnsServer.respond({ answers });
  }

  mdnsServer.on("query", respond);
  mdnsServer.on("error", (error) => {
    console.error("[mdns] Broadcast error:", error);
  });

  try {
    const packet = encode({ answers: [cloudphone.ptr, cloudphone.srv, cloudphone.txt, cloudphone.a] });
    mdnsServer.send(packet);
    const packet2 = encode({ answers: [http.ptr, http.srv, http.txt, http.a] });
    mdnsServer.send(packet2);
  } catch (error) {
    console.warn("[mdns] Initial announce failed:", error);
  }

  console.log(`[mdns] Broadcast ready: _cloudphone._tcp on port ${port} (${ipv4})`);
  console.log(`[mdns] Broadcast ready: _http._tcp on port ${port} (${ipv4})`);
  if (lanList.length > 1) {
    console.log(`[mdns] LAN addresses: ${lanList.join(", ")}`);
  }

  return async () => {
    try {
      mdnsServer.removeListener("query", respond);
      mdnsServer.destroy();
    } catch (error) {
      console.warn("[mdns] Stop failed:", error);
    }
  };
}
