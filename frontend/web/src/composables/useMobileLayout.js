import { onBeforeUnmount, onMounted, ref } from "vue";

export const MOBILE_LAYOUT_BREAKPOINT = 560;

export function useMobileLayout() {
  const isMobileLayout = ref(false);

  function updateLayout() {
    isMobileLayout.value = window.innerWidth <= MOBILE_LAYOUT_BREAKPOINT;
  }

  onMounted(() => {
    updateLayout();
    window.addEventListener("resize", updateLayout);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", updateLayout);
  });

  return {
    isMobileLayout,
  };
}
