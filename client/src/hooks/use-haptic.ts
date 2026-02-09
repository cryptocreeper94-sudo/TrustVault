import { useCallback } from "react";

type HapticPattern = "tap" | "success" | "warning" | "error";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 10,
  success: [10, 50, 10],
  warning: [20, 40, 20],
  error: [30, 50, 30, 50, 30],
};

export function useHaptic() {
  const vibrate = useCallback((pattern: HapticPattern = "tap") => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(PATTERNS[pattern]);
      } catch {}
    }
  }, []);

  return vibrate;
}
