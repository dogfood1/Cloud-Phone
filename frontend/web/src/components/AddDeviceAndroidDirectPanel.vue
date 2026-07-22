<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";

import UiButton from "./ui/UiButton.vue";
import { getErrorMessage, requestJson } from "../utils/api.js";

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

const form = ref({
  host: "",
  port: "5555",
});
const pending = ref(false);
const result = ref(null);

function formatConnectMessage(connect) {
  if (!connect) {
    return t("devices.addDeviceModal.pairCode.connectSkipped");
  }

  if (connect.success) {
    return (
      connect.connectedEndpoint ||
      connect.attempts?.find((item) => item.ok)?.output ||
      t("devices.addDeviceModal.directConnect.connectSuccess")
    );
  }

  const failedAttempt = connect.attempts?.find((item) => !item.ok && item.output);
  return failedAttempt?.output || t("devices.addDeviceModal.directConnect.connectFailed");
}

async function submitDirectConnect() {
  pending.value = true;
  result.value = null;

  try {
    const host = form.value.host.trim();
    const port = Number.parseInt(form.value.port, 10);

    const response = await requestJson("/api/devices/connect", {
      method: "POST",
      allowFailure: true,
      body: { host, port },
    });

    result.value = {
      ok: Boolean(response.success),
      message: formatConnectMessage(response.connect),
    };

    if (response.success) {
      props.onConnected?.();
    }
  } catch (error) {
    result.value = {
      ok: false,
      message: getErrorMessage(error, t("devices.addDeviceModal.directConnect.connectFailed")),
    };
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div class="add-device-modal__pair-code">
    <div class="add-device-modal__pair-hint">
      <h3>{{ t("devices.addDeviceModal.directConnect.stepsTitle") }}</h3>
      <ol>
        <li>{{ t("devices.addDeviceModal.directConnect.stepEnsureAdb") }}</li>
        <li>{{ t("devices.addDeviceModal.directConnect.stepEnterEndpoint") }}</li>
        <li>{{ t("devices.addDeviceModal.directConnect.stepConnect") }}</li>
      </ol>
      <p class="add-device-modal__direct-note">
        {{ t("devices.addDeviceModal.directConnect.hint") }}
      </p>
    </div>

    <form class="add-device-modal__pair-form" @submit.prevent="submitDirectConnect">
      <label>
        <span>{{ t("devices.addDeviceModal.directConnect.ipPort") }}</span>
        <div class="add-device-modal__pair-row">
          <input
            v-model.trim="form.host"
            type="text"
            required
            :placeholder="t('devices.addDeviceModal.directConnect.ipPlaceholder')"
          />
          <input
            v-model.trim="form.port"
            type="number"
            min="1"
            max="65535"
            required
            :placeholder="t('devices.addDeviceModal.directConnect.portPlaceholder')"
          />
        </div>
      </label>

      <div class="add-device-modal__pair-actions">
        <UiButton variant="ghost" @click="props.onBack?.()">
          {{ t("common.back") }}
        </UiButton>
        <UiButton variant="primary" attr-type="submit" :disabled="pending">
          {{
            pending
              ? t("devices.addDeviceModal.directConnect.connecting")
              : t("devices.addDeviceModal.directConnect.submit")
          }}
        </UiButton>
      </div>
    </form>

    <div v-if="result" class="add-device-modal__pair-result">
      <p :class="result.ok ? 'result-ok' : 'result-fail'">
        {{
          result.ok
            ? t("devices.addDeviceModal.directConnect.connectSuccess")
            : t("devices.addDeviceModal.directConnect.connectFailed")
        }}
        ：{{ result.message }}
      </p>
    </div>
  </div>
</template>
