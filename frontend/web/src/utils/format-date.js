import { i18n } from "../i18n/index.js";

function getDateLocale() {
  return i18n.global.locale.value;
}

export function formatDate(value) {
  if (!value) {
    return i18n.global.t("common.dateUnset");
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return i18n.global.t("common.dateUnknown");
  }

  return new Intl.DateTimeFormat(getDateLocale(), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
