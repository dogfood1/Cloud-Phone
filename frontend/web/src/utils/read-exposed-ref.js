import { unref } from "vue";

/** Read a boolean exposed from a child `defineExpose` ref (may be Ref or plain boolean). */
export function readExposedBoolean(exposed, defaultValue = true) {
  const value = unref(exposed);

  if (value === undefined || value === null) {
    return defaultValue;
  }

  return Boolean(value);
}

/** Read a number exposed from a child `defineExpose` ref (may be Ref or plain number). */
export function readExposedNumber(exposed, defaultValue = 0) {
  const value = unref(exposed);

  if (typeof value !== "number" || Number.isNaN(value)) {
    return defaultValue;
  }

  return value;
}
