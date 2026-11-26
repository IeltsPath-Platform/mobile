import { useCallback, useRef } from 'react';

/**
 * Runs one task at a time. A `busy` state only disables a button after the next render, so two quick taps can both get
 * through; this guard is set at once. A call made while the task is running does nothing.
 */
export function useSingleFlight() {
  const running = useRef(false);
  return useCallback(async (task: () => Promise<unknown>) => {
    if (running.current) return;
    running.current = true;
    try {
      await task();
    } finally {
      running.current = false;
    }
  }, []);
}
