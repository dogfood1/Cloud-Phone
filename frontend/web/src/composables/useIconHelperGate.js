import { computed, ref } from "vue";

import { requestJson } from "../utils/api.js";
import {
  recordSerialIconHelperDenial,
  resolveIconHelperConsent,
  setSerialIconHelperAllowed,
} from "../utils/icon-helper-consent.js";

/**
 * Shared gate for Start menu / Apps manager: consent → install → extract → progress.
 */
export function useIconHelperGate() {
  const consentDialogOpen = ref(false);
  const pendingSerial = ref("");
  const consentResolver = ref(null);

  const phase = ref("idle");
  const progress = ref({
    phase: "idle",
    total: 0,
    done: 0,
    current: "",
    message: "",
  });
  const errorMessage = ref("");
  const packageNamesOnly = ref(false);

  const progressText = computed(() => {
    const p = progress.value;
    if (phase.value === "ensuring") {
      return "installing";
    }
    if (p.phase === "running" && p.total > 0) {
      return `${p.done}/${p.total}`;
    }
    if (p.phase === "running") {
      return "extracting";
    }
    if (p.phase === "done") {
      return "done";
    }
    if (p.phase === "error") {
      return p.message || "error";
    }
    return "";
  });

  const progressPercent = computed(() => {
    const p = progress.value;
    if (!p.total) {
      return phase.value === "ensuring" ? 5 : 0;
    }
    return Math.min(100, Math.round((p.done / p.total) * 100));
  });

  /**
   * @param {string} serial
   * @returns {Promise<"allowed" | "denied">}
   */
  function ensureConsent(serial) {
    const existing = resolveIconHelperConsent(serial);
    if (existing === "allowed" || existing === "denied") {
      return Promise.resolve(existing);
    }

    pendingSerial.value = serial;
    consentDialogOpen.value = true;

    return new Promise((resolve) => {
      consentResolver.value = resolve;
    });
  }

  /**
   * @param {boolean} allowed
   */
  function answerConsent(allowed) {
    const serial = pendingSerial.value;
    if (serial) {
      if (allowed) {
        setSerialIconHelperAllowed(serial);
      } else {
        recordSerialIconHelperDenial(serial);
      }
    }
    consentDialogOpen.value = false;
    const resolve = consentResolver.value;
    consentResolver.value = null;
    pendingSerial.value = "";
    resolve?.(allowed ? "allowed" : "denied");
  }

  /**
   * @param {string} serial
   * @returns {Promise<{ ok: boolean, packageNamesOnly: boolean }>}
   */
  async function prepareIconHelper(serial) {
    errorMessage.value = "";
    packageNamesOnly.value = false;

    if (!serial) {
      packageNamesOnly.value = true;
      return { ok: false, packageNamesOnly: true };
    }

    const consent = await ensureConsent(serial);
    if (consent === "denied") {
      packageNamesOnly.value = true;
      phase.value = "denied";
      return { ok: false, packageNamesOnly: true };
    }

    try {
      phase.value = "ensuring";
      await requestJson(`/api/devices/${encodeURIComponent(serial)}/icon-helper/ensure`, {
        method: "POST",
      });

      phase.value = "extracting";
      await requestJson(`/api/devices/${encodeURIComponent(serial)}/icon-helper/extract`, {
        method: "POST",
      });

      await pollUntilDone(serial);
      phase.value = progress.value.phase === "error" ? "error" : "ready";

      if (progress.value.phase === "error") {
        errorMessage.value = progress.value.message || "extract failed";
        packageNamesOnly.value = true;
        return { ok: false, packageNamesOnly: true };
      }

      packageNamesOnly.value = false;
      return { ok: true, packageNamesOnly: false };
    } catch (error) {
      phase.value = "error";
      errorMessage.value = error instanceof Error ? error.message : String(error);
      packageNamesOnly.value = true;
      return { ok: false, packageNamesOnly: true };
    }
  }

  /**
   * @param {string} serial
   */
  async function pollUntilDone(serial) {
    const deadline = Date.now() + 10 * 60_000;

    while (Date.now() < deadline) {
      const result = await requestJson(
        `/api/devices/${encodeURIComponent(serial)}/icon-helper/progress`,
      );
      const next = result.progress || {};
      progress.value = {
        phase: String(next.phase || "running"),
        total: Number(next.total) || 0,
        done: Number(next.done) || 0,
        current: String(next.current || ""),
        message: String(next.message || ""),
      };

      if (progress.value.phase === "done" || progress.value.phase === "error") {
        return;
      }

      await sleep(600);
    }

    progress.value = {
      ...progress.value,
      phase: "error",
      message: "timeout",
    };
  }

  function resetGate() {
    phase.value = "idle";
    progress.value = { phase: "idle", total: 0, done: 0, current: "", message: "" };
    errorMessage.value = "";
  }

  return {
    consentDialogOpen,
    phase,
    progress,
    progressText,
    progressPercent,
    errorMessage,
    packageNamesOnly,
    ensureConsent,
    answerConsent,
    prepareIconHelper,
    resetGate,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
