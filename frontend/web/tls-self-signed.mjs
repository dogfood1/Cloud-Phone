import selfsigned from "selfsigned";

export async function createSelfSignedTlsOptions(extraSans = []) {
  const altNames = [
    { type: 2, value: "localhost" },
    { type: 7, ip: "127.0.0.1" },
    ...extraSans.map(parseSanEntry).filter(Boolean),
  ];

  const cert = await selfsigned.generate([{ name: "commonName", value: "Cloud Phone" }], {
    keySize: 2048,
    algorithm: "sha256",
    extensions: [
      { name: "basicConstraints", cA: true },
      { name: "keyUsage", keyCertSign: true, digitalSignature: true },
      {
        name: "subjectAltName",
        altNames,
      },
    ],
  });

  return { key: cert.private, cert: cert.cert };
}

function parseSanEntry(entry) {
  const value = String(entry).trim();

  if (!value) {
    return null;
  }

  if (/^\d+\.\d+\.\d+\.\d+$/.test(value) || value.includes(":")) {
    return { type: 7, ip: value };
  }

  return { type: 2, value };
}
