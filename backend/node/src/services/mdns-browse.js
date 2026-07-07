import mdns from "multicast-dns";

function normalizeMdnsServiceType(serviceType) {
  if (!serviceType) {
    return null;
  }

  const trimmed = serviceType.trim();

  if (!trimmed.startsWith("_") || !trimmed.endsWith("._tcp")) {
    return null;
  }

  return trimmed;
}

function parseTxtRecord(data) {
  const txt = {};

  for (const chunk of data ?? []) {
    const text = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
    const index = text.indexOf("=");

    if (index <= 0) {
      continue;
    }

    txt[text.slice(0, index)] = text.slice(index + 1);
  }

  return txt;
}

function parseDnsSdEntry(instanceName, entry) {
  const srv = entry?.srv;
  const txt = entry?.txt;
  const a = entry?.a;
  const port = Number(srv?.data?.port);
  const target = srv?.data?.target ? String(srv.data.target) : "";
  const host = a?.data ? String(a.data) : "";

  if (!instanceName || !host || !Number.isInteger(port) || port <= 0) {
    return null;
  }

  const serviceTypeMatch = instanceName.match(/(\._[^.]+?\._tcp)\.local$/);
  const serviceType = serviceTypeMatch ? serviceTypeMatch[1] : null;
  const name = String(instanceName).replace(/(\._[^.]+?\._tcp)\.local$/, "").replace(/\.$/, "");

  return {
    fullName: instanceName,
    name,
    serviceType,
    host,
    port,
    target,
    txt: parseTxtRecord(txt?.data),
  };
}

/**
 * Browse LAN for all instances of a DNS-SD service type.
 * @param {{ serviceType: string, timeoutMs?: number }} options
 */
export function browseMdnsServices({ serviceType, timeoutMs = 3000 }) {
  const normalizedType = normalizeMdnsServiceType(serviceType);

  if (!normalizedType) {
    return Promise.resolve([]);
  }

  const mdnsClient = mdns();
  const combined = new Map();
  const results = new Map();

  return new Promise((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);

      try {
        mdnsClient.removeListener("response", onResponse);
        mdnsClient.destroy();
      } catch {
        // ignore
      }

      resolve([...results.values()]);
    };

    const timer = setTimeout(finish, timeoutMs);

    const onResponse = (res) => {
      for (const answer of [...(res.answers ?? []), ...(res.additionals ?? [])]) {
        if (!answer?.name || !answer?.type) {
          continue;
        }

        const name = String(answer.name);
        const type = String(answer.type);
        const entry = combined.get(name) ?? {};

        if (type === "PTR") {
          const instance = String(answer.data ?? "");

          if (instance) {
            combined.set(instance, combined.get(instance) ?? {});
          }

          continue;
        }

        if (type === "SRV") {
          entry.srv = answer;
          combined.set(name, entry);
        } else if (type === "TXT") {
          entry.txt = answer;
          combined.set(name, entry);
        } else if (type === "A") {
          entry.a = answer;
          combined.set(name, entry);
        }
      }

      for (const [instanceName, entry] of combined.entries()) {
        const srvTarget = entry.srv?.data?.target;

        if (srvTarget && !entry.a) {
          const aRecord = [...(res.additionals ?? []), ...(res.answers ?? [])].find(
            (record) => record?.type === "A" && record?.name === srvTarget,
          );

          if (aRecord) {
            entry.a = aRecord;
          }
        }

        const item = parseDnsSdEntry(instanceName, entry);

        if (!item || item.serviceType !== normalizedType) {
          continue;
        }

        results.set(item.fullName, item);
      }
    };

    mdnsClient.on("response", onResponse);
    mdnsClient.query([{ name: `${normalizedType}.local`, type: "PTR" }]);
  });
}
