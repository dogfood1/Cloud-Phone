import { createApp } from "vue";

import App from "./App.vue";
import "./assets/main.css";
import "./assets/mirror-settings.css";
import { i18n } from "./i18n/index.js";
import { initLocale } from "./i18n/locale-store.js";
import { initTheme } from "./utils/theme-store.js";

initTheme();
initLocale();

const app = createApp(App);
app.use(i18n);
app.mount("#app");
