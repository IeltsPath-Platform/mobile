import { useEffect, useState } from 'react';

import { Text, type TextProps } from '@/src/components/ui/text';

/** Number that counts from 0 to `value` once, easing out. */
export function CountUp({ value, duration = 1000, ...props }: TextProps & { value: number; duration?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setShown(Math.round(value * (1 - (1 - t) ** 3)));
      if (t >= 1) clearInterval(timer);
    }, 32);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <Text {...props}>{shown}</Text>;
}
