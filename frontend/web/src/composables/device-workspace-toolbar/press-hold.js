import { ref } from "vue";

export function createToolbarPressHold({ castViewportRef }) {
  /** @type {import('vue').Ref<Map<number, string>>} */
  const activePresses = ref(new Map());

  function usesPressHold(action) {
    return action.kind === "cast-navigation" && action.pressHold === true;
  }

  function sendPressPhase(pressActionId, phase) {
    castViewportRef.value?.sendNavigationPress?.(pressActionId, phase);
  }

  function releasePointerPress(pointerId) {
    const pressActionId = activePresses.value.get(pointerId);

    if (!pressActionId) {
      return;
    }

    activePresses.value.delete(pointerId);
    sendPressPhase(pressActionId, "up");
  }

  function releaseAllPresses() {
    for (const pointerId of [...activePresses.value.keys()]) {
      releasePointerPress(pointerId);
    }
  }

  function onWindowPointerUp(event) {
    releasePointerPress(event.pointerId);
  }

  function isActionPressed(action) {
    if (!usesPressHold(action)) {
      return false;
    }

    for (const pressActionId of activePresses.value.values()) {
      if (pressActionId === action.id) {
        return true;
      }
    }

    return false;
  }

  function onToolbarPointerDown(action, event, { isActionDisabled }) {
    if (
      !usesPressHold(action) ||
      isActionDisabled(action) ||
      event.button !== 0 ||
      event.isPrimary === false
    ) {
      return;
    }

    event.preventDefault();

    const target = event.currentTarget;

    if (target instanceof Element && "setPointerCapture" in target) {
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        // ignore
      }
    }

    if (activePresses.value.has(event.pointerId)) {
      return;
    }

    activePresses.value.set(event.pointerId, action.id);
    sendPressPhase(action.id, "down");
  }

  function onToolbarPointerUp(action, event) {
    if (!usesPressHold(action)) {
      return;
    }

    if (event.type === "pointerup" && event.button !== 0) {
      return;
    }

    releasePointerPress(event.pointerId);

    const target = event.currentTarget;

    if (target instanceof Element && "releasePointerCapture" in target) {
      try {
        if (target.hasPointerCapture?.(event.pointerId)) {
          target.releasePointerCapture(event.pointerId);
        }
      } catch {
        // ignore
      }
    }
  }

  return {
    activePresses,
    usesPressHold,
    releaseAllPresses,
    onWindowPointerUp,
    isActionPressed,
    onToolbarPointerDown,
    onToolbarPointerUp,
  };
}
