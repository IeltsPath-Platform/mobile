import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/src/theme';

import { Text } from './text';

type BrandLogoProps = {
  size?: 'sm' | 'md';
};

export function BrandLogo({ size = 'md' }: BrandLogoProps) {
  const stamp = size === 'sm' ? 30 : 38;

  return (
    <View className="flex-row items-center gap-2" accessibilityRole="header" accessibilityLabel="IELTSPath">
      <View style={{ width: stamp, height: stamp }} className="items-center justify-center">
        <Svg width={stamp} height={stamp} style={{ position: 'absolute' }}>
          <Defs>
            <LinearGradient id="stamp" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.accent} />
              <Stop offset="1" stopColor={colors.accentDeep} />
            </LinearGradient>
          </Defs>
          <Rect width={stamp} height={stamp} rx={stamp * 0.3} fill="url(#stamp)" />
        </Svg>
        <Text weight="black" className="text-white" style={{ fontSize: stamp * 0.4 }}>
          IP
        </Text>
      </View>
      <Text weight="extrabold" className={size === 'sm' ? 'text-lg' : 'text-xl'} style={{ letterSpacing: -0.4 }}>
        IELTS
        <Text weight="black" className="text-accent-deep">
          Path
        </Text>
      </Text>
    </View>
  );
}
