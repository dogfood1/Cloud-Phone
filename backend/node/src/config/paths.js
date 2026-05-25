import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);

export const PROJECT_ROOT_PATH = path.resolve(currentDirPath, "..", "..", "..", "..");
export const BACKEND_NODE_ROOT_PATH = path.resolve(currentDirPath, "..", "..");
export const BACKEND_DATA_PATH = process.env.CLOUD_PHONE_DATA_DIR
  ? path.resolve(process.env.CLOUD_PHONE_DATA_DIR)
  : path.resolve(BACKEND_NODE_ROOT_PATH, "data");
export const FRONTEND_WEB_ROOT_PATH = path.resolve(PROJECT_ROOT_PATH, "frontend", "web");
