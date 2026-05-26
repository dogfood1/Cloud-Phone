function optionLabel(option) {
  const label = option?.label;
  if (typeof label === "function") {
    return String(option.value ?? "");
  }
  return String(label ?? option?.value ?? "");
}

function optionMatchesQuery(option, query) {
  const haystack = `${optionLabel(option)} ${option?.value ?? ""}`.toLowerCase();
  return haystack.includes(query);
}

/**
 * Filter Naive UI–style select options (flat or grouped).
 * @param {import('naive-ui').SelectMixedOption[]} options
 * @param {string} pattern
 */
export function filterSelectOptions(options, pattern) {
  const query = String(pattern ?? "")
    .trim()
    .toLowerCase();

  if (!query) {
    return options;
  }

  const result = [];

  for (const item of options) {
    if (Array.isArray(item.children)) {
      const matched = item.children.filter((child) => optionMatchesQuery(child, query));
      if (matched.length) {
        result.push({ ...item, children: matched });
      }
      continue;
    }

    if (item.type === "group") {
      continue;
    }

    if (optionMatchesQuery(item, query)) {
      result.push(item);
    }
  }

  return result;
}

/**
 * @param {import('naive-ui').SelectMixedOption[]} options
 * @param {string|number|null|undefined} value
 */
export function findSelectOptionLabel(options, value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  for (const item of options) {
    const children = item.children;

    if (Array.isArray(children)) {
      const child = children.find((entry) => entry.value === value);
      if (child) {
        return optionLabel(child);
      }
      continue;
    }

    if (item.type === "group") {
      continue;
    }

    if (item.value === value) {
      return optionLabel(item);
    }
  }

  return String(value);
}
