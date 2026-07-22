/**
 * Parse `adb shell dumpsys notification --noredact` into structured rows.
 * @param {string} stdout
 * @returns {Array<{ id: string, key: string, packageName: string, title: string, text: string, postTime: number }>}
 */
export function parseNotificationDump(stdout) {
  const records = [];
  const blocks = splitNotificationRecords(stdout);

  for (const block of blocks) {
    const parsed = parseNotificationBlock(block);
    if (parsed) {
      records.push(parsed);
    }
  }

  return records;
}

/**
 * @param {string} stdout
 * @returns {string[]}
 */
function splitNotificationRecords(stdout) {
  const lines = stdout.split(/\r?\n/);
  const blocks = [];
  let current = null;

  for (const line of lines) {
    if (/^\s*NotificationRecord\(/.test(line) || /^NotificationRecord\(/.test(line)) {
      if (current) {
        blocks.push(current.join("\n"));
      }
      current = [line];
      continue;
    }

    if (current) {
      current.push(line);
    }
  }

  if (current) {
    blocks.push(current.join("\n"));
  }

  return blocks;
}

/**
 * @param {string} block
 * @returns {{ id: string, key: string, packageName: string, title: string, text: string, postTime: number } | null}
 */
function parseNotificationBlock(block) {
  const pkgMatch =
    block.match(/\bpkg=([^\s]+)/) ||
    block.match(/\bopPkg=([^\s]+)/) ||
    block.match(/ApplicationInfo\{[0-9a-fA-F]+\s+([a-zA-Z][\w.]*)\}/);

  if (!pkgMatch) {
    return null;
  }

  const packageName = pkgMatch[1].replace(/,$/, "");
  if (!packageName) {
    return null;
  }

  const keyMatch = block.match(/\bkey=([^\s]+)/);
  const idMatch = block.match(/\bid=(\d+)/);
  const postTimeMatch = block.match(/\bpostTime=(\d+)/);
  const whenMatch = block.match(/\bwhen=(\d+)/);

  const title =
    extractExtraString(block, "android.title") ||
    extractExtraString(block, "android.conversationTitle") ||
    extractQuotedField(block, "tickerText") ||
    "";

  const text =
    extractExtraString(block, "android.bigText") ||
    extractExtraString(block, "android.text") ||
    extractExtraString(block, "android.subText") ||
    extractExtraString(block, "android.infoText") ||
    "";

  if (!title && !text) {
    return null;
  }

  const key = keyMatch?.[1] ?? `${packageName}:${idMatch?.[1] ?? recordsSafeId(block)}`;
  const postTime = Number(postTimeMatch?.[1] || whenMatch?.[1] || 0);

  return {
    id: key,
    key,
    packageName,
    title: cleanText(title) || packageName,
    text: cleanText(text),
    postTime,
  };
}

/**
 * @param {string} block
 * @param {string} key
 */
function extractExtraString(block, key) {
  const escaped = key.replace(/\./g, "\\.");
  const patterns = [
    new RegExp(`${escaped}=String\\s*\\(([^)]*)\\)`),
    new RegExp(`${escaped}=CharSequence\\s*\\(([^)]*)\\)`),
    new RegExp(`${escaped}=([^\\n]+)`),
  ];

  for (const pattern of patterns) {
    const match = block.match(pattern);
    if (!match) {
      continue;
    }

    const raw = match[1].trim();
    if (!raw || raw === "null" || raw === "String" || raw === "CharSequence") {
      continue;
    }

    return stripWrappingQuotes(raw);
  }

  return "";
}

/**
 * @param {string} block
 * @param {string} field
 */
function extractQuotedField(block, field) {
  const match = block.match(new RegExp(`${field}=([^\\s]+)`));
  if (!match || match[1] === "null") {
    return "";
  }

  return stripWrappingQuotes(match[1]);
}

function stripWrappingQuotes(value) {
  return value.replace(/^["']|["']$/g, "").trim();
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function recordsSafeId(block) {
  return String(Math.abs(hashCode(block.slice(0, 120))));
}

function hashCode(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
