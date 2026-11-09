import { useEffect, useState } from 'react';

/**
 * Whole seconds left until `target` (ISO string), measured on the server clock.
 * Returns null when there is no target. Only re-renders when the value changes.
 */
export function useCountdown(target: string | null | undefined, serverOffsetMs: number, tickMs = 250) {
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => {
    if (!target) {
      setSeconds(null);
      return;
    }
    const end = Date.parse(target);
    const tick = () => setSeconds(Math.max(0, Math.ceil((end - (Date.now() + serverOffsetMs)) / 1000)));
    tick();
    const timer = setInterval(tick, tickMs);
    return () => clearInterval(timer);
  }, [target, serverOffsetMs, tickMs]);
  return seconds;
}
