import { useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { Text, type TextProps } from '@/src/components/ui/text';

/** Number that counts from 0 to `value` once, easing out. Reduced motion shows the final value. */
export function CountUp({ value, duration = 1000, ...props }: TextProps & { value: number; duration?: number }) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(reduceMotion ? value : 0);
  useEffect(() => {
    if (reduceMotion) {
      setShown(value);
      return;
    }
    const start = Date.now();
    const timer = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setShown(Math.round(value * (1 - (1 - t) ** 3)));
      if (t >= 1) clearInterval(timer);
    }, 32);
    return () => clearInterval(timer);
  }, [value, duration, reduceMotion]);
  return <Text {...props}>{shown}</Text>;
}
