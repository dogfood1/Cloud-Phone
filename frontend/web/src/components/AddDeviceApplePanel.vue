<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { Icon } from "@iconify/vue";
import { useI18n } from "vue-i18n";

import { getErrorMessage, requestJson } from "../utils/api.js";
import UiButton from "./ui/UiButton.vue";

const props = defineProps({
  onBack: {
    type: Function,
    default: null,
  },
  onConnected: {
    type: Function,
    default: null,
  },
});

const { t } = useI18n();

const STEPS = ["prepare", "login", "sign", "install", "discover", "connect"];

const prepareInfo = ref(null);
const prepareError = ref("");
const loadingPrepare = ref(true);

const appleId = ref("");
const password = ref("");
const skipInstall = ref(false);
const skipSign = ref(false);

const pipelineJob = ref(null);
const pipelineError = ref("");
const running = ref(false);
const pollTimer = ref(null);

const currentStepIndex = computed(() => {
  const step = pipelineJob.value?.step ?? "prepare";
  const index = STEPS.indexOf(step);
  return index >= 0 ? index : 0;
});

const overallProgress = computed(() => pipelineJob.value?.progress ?? (loadingPrepare.value ? 2 : 8));

const isCompleted = computed(() => pipelineJob.value?.status === "completed");
const isFailed = computed(() => pipelineJob.value?.status === "error");

const pipelineLogsText = computed(() => {
  const logs = pipelineJob.value?.logs;

  if (!Array.isArray(logs) || logs.length === 0) {
    return "";
  }

  return logs
    .map((entry) => {
      const step = entry.step ? `[${entry.step}] ` : "";
      const level = entry.level ? `${entry.level}: ` : "";
      return `${step}${level}${entry.message ?? ""}`.trim();
    })
    .filter(Boolean)
    .join("\n");
});

const stepItems = computed(() =>
  STEPS.map((id) => ({
    id,
    label: t(`devices.addDeviceModal.apple.pipeline.steps.${id}`),
    state: resolveStepState(id),
  })),
);

function resolveStepState(stepId) {
  const job = pipelineJob.value;

  if (!job) {
    return stepId === "prepare" && !loadingPrepare.value ? "done" : "pending";
  }

  if (job.status === "error" && job.step === stepId) {
    return "error";
  }

  const stepIndex = STEPS.indexOf(stepId);
  const activeIndex = STEPS.indexOf(job.step);

  if (job.status === "completed") {
    return "done";
  }

  if (stepIndex < activeIndex) {
    return "done";
  }

  if (stepIndex === activeIndex) {
    return job.status === "error" ? "error" : "active";
  }

  return "pending";
}

async function loadPrepare() {
  loadingPrepare.value = true;
  prepareError.value = "";

  try {
    prepareInfo.value = await requestJson("/api/devices/ios/wda/prepare");
  } catch (error) {
    prepareError.value = getErrorMessage(error, t("devices.addDeviceModal.apple.pipeline.prepareFailed"));
  } finally {
    loadingPrepare.value = false;
  }
}

function stopPolling() {
  if (pollTimer.value) {
    clearInterval(pollTimer.value);
    pollTimer.value = null;
  }
}

async function pollPipeline(jobId) {
  const payload = await requestJson(`/api/devices/ios/wda/pipeline/${encodeURIComponent(jobId)}`);
  pipelineJob.value = payload.job ?? null;

  if (pipelineJob.value?.status === "completed") {
    stopPolling();
    running.value = false;

    if (pipelineJob.value.result?.device) {
      props.onConnected?.(pipelineJob.value.result.device);
    }
  }

  if (pipelineJob.value?.status === "error") {
    stopPolling();
    running.value = false;
    pipelineError.value = pipelineJob.value.error || pipelineJob.value.message;
  }
}

function startPolling(jobId) {
  stopPolling();
  pollTimer.value = window.setInterval(() => {
    void pollPipeline(jobId).catch((error) => {
      pipelineError.value = getErrorMessage(error, t("devices.addDeviceModal.apple.pipeline.pollFailed"));
      stopPolling();
      running.value = false;
    });
  }, 700);
}

async function startPipeline(options = {}) {
  pipelineError.value = "";

  const useSkipInstall = options.skipInstall ?? skipInstall.value;
  const useSkipSign = options.skipSign ?? skipSign.value;

  if (!useSkipSign && (!appleId.value.trim() || !password.value.trim())) {
    pipelineError.value = t("devices.addDeviceModal.apple.pipeline.loginRequired");
    return;
  }

  if (!prepareInfo.value?.prepare?.ipaExists && !useSkipInstall) {
    pipelineError.value = t("devices.addDeviceModal.apple.pipeline.ipaMissing");
    return;
  }

  if (!prepareInfo.value?.prepare?.ipaExists && useSkipInstall && !useSkipSign) {
    pipelineError.value = t("devices.addDeviceModal.apple.pipeline.ipaMissing");
    return;
  }

  running.value = true;
  pipelineJob.value = {
    status: "running",
    step: "prepare",
    progress: 0,
    message: t("devices.addDeviceModal.apple.pipeline.starting"),
  };

  try {
    const result = await requestJson("/api/devices/ios/wda/pipeline", {
      method: "POST",
      body: {
        appleId: appleId.value.trim(),
        password: password.value,
        skipInstall: useSkipInstall,
        skipSign: useSkipSign,
      },
    });

    pipelineJob.value = result.job;
    startPolling(result.job.id);
    await pollPipeline(result.job.id);
  } catch (error) {
    running.value = false;
    pipelineError.value = getErrorMessage(error, t("devices.addDeviceModal.apple.pipeline.startFailed"));
    pipelineJob.value = {
      status: "error",
      step: "prepare",
      progress: 0,
      message: pipelineError.value,
      error: pipelineError.value,
    };
  }
}

function startSkipInstallPipeline() {
  skipInstall.value = true;
  skipSign.value = true;
  void startPipeline({ skipInstall: true, skipSign: true });
}

onMounted(() => {
  void loadPrepare();
});

onBeforeUnmount(() => {
  stopPolling();
});
</script>

<template>
  <div class="apple-panel apple-panel--wizard">
    <div class="apple-panel__hero" aria-hidden="true">
      <div class="apple-panel__glow" />
      <Icon icon="mdi:apple" class="apple-panel__hero-icon" />
      <div class="apple-panel__rings">
        <span />
        <span />
        <span />
      </div>
    </div>

    <div class="apple-panel__content">
      <div class="apple-wizard__progress-head">
        <div class="apple-wizard__progress-meta">
          <strong>{{ t("devices.addDeviceModal.apple.pipeline.title") }}</strong>
          <span>{{ pipelineJob?.message || t("devices.addDeviceModal.apple.pipeline.subtitle") }}</span>
        </div>
        <div class="apple-wizard__progress-value">{{ overallProgress }}%</div>
      </div>

      <div class="apple-wizard__progress-track" aria-hidden="true">
        <div class="apple-wizard__progress-bar" :style="{ width: `${overallProgress}%` }" />
      </div>

      <ol class="apple-wizard__steps">
        <li
          v-for="(step, index) in stepItems"
          :key="step.id"
          class="apple-wizard__step"
          :class="[
            `apple-wizard__step--${step.state}`,
            { 'apple-wizard__step--current': index === currentStepIndex },
          ]"
        >
          <span class="apple-wizard__step-index">
            <Icon
              v-if="step.state === 'done'"
              icon="lucide:check"
            />
            <Icon
              v-else-if="step.state === 'error'"
              icon="lucide:x"
            />
            <Icon
              v-else-if="step.state === 'active'"
              icon="lucide:loader-circle"
              class="apple-wizard__spin"
            />
            <template v-else>{{ index + 1 }}</template>
          </span>
          <span class="apple-wizard__step-label">{{ step.label }}</span>
        </li>
      </ol>

      <section class="apple-wizard__card">
        <h3>{{ t("devices.addDeviceModal.apple.pipeline.prepareTitle") }}</h3>
        <p v-if="loadingPrepare" class="apple-panel__empty">
          {{ t("devices.addDeviceModal.apple.pipeline.prepareLoading") }}
        </p>
        <ul v-else-if="prepareInfo" class="apple-wizard__checklist">
          <li :class="{ 'is-ok': prepareInfo.prepare?.ipaExists, 'is-fail': !prepareInfo.prepare?.ipaExists }">
            <Icon :icon="prepareInfo.prepare?.ipaExists ? 'lucide:check' : 'lucide:x'" />
            {{ t("devices.addDeviceModal.apple.pipeline.checkIpa") }}
          </li>
          <li :class="{ 'is-ok': prepareInfo.python?.ok, 'is-fail': !prepareInfo.python?.ok }">
            <Icon :icon="prepareInfo.python?.ok ? 'lucide:check' : 'lucide:x'" />
            Python {{ prepareInfo.python?.version || prepareInfo.python?.error }}
          </li>
          <li :class="{ 'is-ok': prepareInfo.pymobiledevice3?.ok, 'is-fail': !prepareInfo.pymobiledevice3?.ok }">
            <Icon :icon="prepareInfo.pymobiledevice3?.ok ? 'lucide:check' : 'lucide:x'" />
            pymobiledevice3
          </li>
          <li :class="{ 'is-ok': prepareInfo.prepare?.zsignWasmAvailable, 'is-warn': !prepareInfo.prepare?.zsignWasmAvailable }">
            <Icon :icon="prepareInfo.prepare?.zsignWasmAvailable ? 'lucide:check' : 'lucide:alert-triangle'" />
            zsign-wasm
            <template v-if="prepareInfo.prepare?.zsignWasmVersion">
              (v{{ prepareInfo.prepare.zsignWasmVersion }})
            </template>
            <template v-else>
              ({{ t("devices.addDeviceModal.apple.pipeline.zsignWasmMissing") }})
            </template>
          </li>
        </ul>
        <p v-if="prepareInfo?.hints?.installHint" class="apple-wizard__hint">
          {{ prepareInfo.hints.installHint }}
        </p>
        <p v-if="prepareError" class="apple-wizard__error">{{ prepareError }}</p>
      </section>

      <section class="apple-wizard__card">
        <h3>{{ t("devices.addDeviceModal.apple.pipeline.loginTitle") }}</h3>
        <form class="apple-wizard__form" @submit.prevent="startPipeline">
          <label>
            <span>Apple ID</span>
            <input v-model.trim="appleId" type="email" autocomplete="username" :disabled="running || skipSign" />
          </label>
          <label>
            <span>{{ t("devices.addDeviceModal.apple.pipeline.passwordLabel") }}</span>
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              :disabled="running || skipSign"
            />
          </label>

          <div class="apple-wizard__toggles">
            <label class="apple-wizard__toggle">
              <input v-model="skipSign" type="checkbox" :disabled="running" />
              <span>{{ t("devices.addDeviceModal.apple.pipeline.skipSign") }}</span>
            </label>
            <label class="apple-wizard__toggle">
              <input v-model="skipInstall" type="checkbox" :disabled="running" />
              <span>{{ t("devices.addDeviceModal.apple.pipeline.skipInstall") }}</span>
            </label>
          </div>

          <div class="apple-wizard__actions">
            <UiButton variant="ghost" :disabled="running" @click="props.onBack?.()">
              {{ t("common.back") }}
            </UiButton>
            <div class="apple-wizard__actions-right">
              <UiButton
                variant="ghost"
                :disabled="running || loadingPrepare"
                @click="startSkipInstallPipeline"
              >
                {{ t("devices.addDeviceModal.apple.pipeline.skipInstallButton") }}
              </UiButton>
              <UiButton variant="primary" attr-type="submit" :disabled="running || loadingPrepare">
                {{
                  running
                    ? t("devices.addDeviceModal.apple.pipeline.running")
                    : t("devices.addDeviceModal.apple.pipeline.start")
                }}
              </UiButton>
            </div>
          </div>
        </form>
      </section>

      <div v-if="pipelineError || isFailed" class="apple-panel__result is-fail">
        <Icon icon="lucide:alert-circle" />
        <span>{{ pipelineError || pipelineJob?.message }}</span>
      </div>

      <section v-if="pipelineLogsText" class="apple-wizard__card">
        <h3>{{ t("devices.addDeviceModal.apple.pipeline.logsTitle") }}</h3>
        <pre class="apple-wizard__logs">{{ pipelineLogsText }}</pre>
      </section>

      <div v-if="isCompleted" class="apple-panel__result is-ok">
        <Icon icon="lucide:check-circle-2" />
        <span>{{ pipelineJob?.message || t("devices.addDeviceModal.apple.pipeline.completed") }}</span>
      </div>
    </div>
  </div>
</template>
