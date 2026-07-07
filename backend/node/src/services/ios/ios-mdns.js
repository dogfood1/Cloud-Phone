import { browseMdnsServices } from "../mdns-browse.js";
import { encode } from "dns-packet";
import mdns from "multicast-dns";

import { pickLanIpv4 } from "../../utils/host-networks.js";

export const IOS_WDA_MDNS_TYPE = "_cloudphone-wda._tcp";

function toTxtRecords(txt) {
  return Object.entries(txt)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => Buffer.from(`${key}=${String(value)}`));
}

function buildServiceRecords({ serviceName, serviceType, port, txt, ipv4 }) {
  const instance = `${serviceName}.${serviceType}.local`;
  const hostname = `${serviceName.replace(/[^a-zA-Z0-9-]/g, "-")}.local`;

  return {
    ptr: { name: `${serviceType}.local`, type: "PTR", data: instance, ttl: 120 },
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

export async function discoverIosWdaBridges({ timeoutMs = 3500 } = {}) {
  const services = await browseMdnsServices({
    serviceType: IOS_WDA_MDNS_TYPE,
    timeoutMs,
  });

  return services.map((service) => {
    const txt = service.txt ?? {};
    const httpPort = Number(txt.http_port ?? txt.httpPort ?? 8100);
    const mjpegPort = Number(txt.mjpeg_port ?? txt.mjpegPort ?? 9100);

    return {
      id: service.fullName,
      name: txt.device_name || txt.name || service.name,
      host: txt.bridge_host || txt.host || service.host,
      httpPort,
      mjpegPort,
      udid: txt.udid || "",
      model: txt.model || "",
      iosVersion: txt.ios_version || txt.iosVersion || "",
      bridgeHost: service.host,
      bridgePort: service.port,
      discoveredAt: Date.now(),
    };
  });
}

export function startIosWdaMdnsBroadcast({
  host = "0.0.0.0",
  serviceName,
  bridgePort = 0,
  lanIpv4,
  txt = {},
}) {
  const ipv4 = lanIpv4 || pickLanIpv4(host);
  const safeName = serviceName || `WDA-${txt.udid?.slice(-6) || "bridge"}`;
  const records = buildServiceRecords({
    serviceName: safeName,
    serviceType: IOS_WDA_MDNS_TYPE,
    port: bridgePort || Number(txt.http_port ?? 8100),
    ipv4,
    txt: {
      bridge_host: ipv4,
      ...txt,
    },
  });

  const mdnsServer = mdns();

  function respond(query) {
    const questions = query?.questions ?? [];
    const answers = [];

    for (const question of questions) {
      if (!question?.name) {
        continue;
      }

      if (question.name === `${IOS_WDA_MDNS_TYPE}.local` && question.type === "PTR") {
        answers.push(records.ptr, records.srv, records.txt, records.a);
      }

      if (question.name === records.srv.name && (question.type === "SRV" || question.type === "ANY")) {
        answers.push(records.srv, records.txt, records.a);
      }
    }

    if (answers.length > 0) {
      mdnsServer.respond({ answers });
    }
  }

  mdnsServer.on("query", respond);

  try {
    const packet = encode({ answers: [records.ptr, records.srv, records.txt, records.a] });
    mdnsServer.send(packet);
  } catch (error) {
    console.warn("[ios-mdns] Initial announce failed:", error);
  }

  console.log(`[ios-mdns] Broadcasting ${IOS_WDA_MDNS_TYPE} on ${ipv4} (${safeName})`);

  return async () => {
    try {
      mdnsServer.removeListener("query", respond);
      mdnsServer.destroy();
    } catch {
      // ignore
    }
  };
}
