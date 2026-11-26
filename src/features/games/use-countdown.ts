import { useCallback, useSyncExternalStore } from 'react';

/**
 * Whole seconds left until `target` (ISO string), measured on the server clock.
 * Returns null when there is no target. Only re-renders when the value changes.
 *
 * The clock is an external store: the value is read from the time itself, so the first render already shows the right
 * number and a changed `target` or offset is reflected at once, with no state kept in sync from an effect.
 */
export function useCountdown(target: string | null | undefined, serverOffsetMs: number, tickMs = 250) {
  // Re-evaluate on a timer while there is something to count down to.
  const subscribe = useCallback((notify: () => void) => {
    if (!target) return () => undefined;
    const timer = setInterval(notify, tickMs);
    return () => clearInterval(timer);
  }, [target, tickMs]);
  // A whole number of seconds, so React compares equal values and skips the re-render until the second changes.
  const read = useCallback(
    () => (target ? Math.max(0, Math.ceil((Date.parse(target) - (Date.now() + serverOffsetMs)) / 1000)) : null),
    [target, serverOffsetMs],
  );
  return useSyncExternalStore(subscribe, read, read);
}
