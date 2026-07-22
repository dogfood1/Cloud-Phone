import { useMessage } from "naive-ui";

import { isSessionExpiredError } from "../utils/api.js";

const DEFAULT_ERROR_DURATION = 5000;

export function useAppFeedback() {
  const message = useMessage();

  return {
    success(content, options = {}) {
      message.success(content, { duration: 2800, ...options });
    },
    error(content, options = {}) {
      if (isSessionExpiredError(content)) {
        return;
      }

      message.error(content, { duration: DEFAULT_ERROR_DURATION, ...options });
    },    warning(content, options = {}) {
      message.warning(content, { duration: 4000, ...options });
    },
    info(content, options = {}) {
      message.info(content, { duration: 3200, ...options });
    },
  };
}
