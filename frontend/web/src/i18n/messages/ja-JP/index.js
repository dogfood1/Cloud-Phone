import app from "./app.js";
import auth from "./auth.js";
import common from "./common.js";
import devices from "./devices.js";
import settings from "./settings.js";

export default { ...common, ...settings, ...auth, ...devices, ...app };
