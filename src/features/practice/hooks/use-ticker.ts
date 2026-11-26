import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

/**
 * A clock that re-reads its value from `read()` every second and whenever the app returns to the foreground, so a
 * phone that slept never shows a stale time. `onZero` fires once when a countdown reaches zero.
 */
export function useTicker(read: () => number, options: { running?: boolean; onZero?: () => void } = {}) {
  const { running = true, onZero } = options;
  const [value, setValue] = useState(read);
  const readRef = useRef(read);
  const zeroRef = useRef(onZero);
  const fired = useRef(false);
  useLayoutEffect(() => { readRef.current = read; });
  useLayoutEffect(() => { zeroRef.current = onZero; });

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const next = readRef.current();
      setValue(next);
      if (next <= 0 && zeroRef.current && !fired.current) {
        fired.current = true;
        zeroRef.current();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') tick(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [running]);

  return value;
}
