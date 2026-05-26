import { createApp } from "vue";

import App from "./App.vue";
import "./assets/main.css";
import "./assets/mirror-settings.css";
import { initTheme } from "./utils/theme-store.js";

initTheme();
createApp(App).mount("#app");
