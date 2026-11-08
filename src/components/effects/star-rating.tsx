import { View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Star } from 'lucide-react-native';

import { colors } from '@/src/theme';

/** Three stars that pop in one after another; `earned` is 1-3. */
export function StarRating({ earned }: { earned: number }) {
  return (
    <View accessible accessibilityLabel={`${earned} trên 3 sao`} className="flex-row items-end gap-2">
      {[0, 1, 2].map((index) => {
        const on = index < earned;
        return (
          <Animated.View key={index} entering={ZoomIn.delay(350 + index * 220).springify().damping(9)} style={{ marginBottom: index === 1 ? 10 : 0 }}>
            <Star size={index === 1 ? 46 : 36} color={on ? colors.xp : colors.line} fill={on ? colors.xp : 'transparent'} strokeWidth={2} />
          </Animated.View>
        );
      })}
    </View>
  );
}
