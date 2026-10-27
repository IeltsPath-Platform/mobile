import { Image, View } from 'react-native';

import { Text } from './text';

type BrandLogoProps = {
  size?: 'sm' | 'md';
};

export function BrandLogo({ size = 'md' }: BrandLogoProps) {
  const stamp = size === 'sm' ? 30 : 40;

  return (
    <View className="flex-row items-center gap-2" accessibilityRole="header" accessibilityLabel="IELTSPath">
      <Image
        source={require('@/assets/images/owl/nav-owl-stand.png')}
        style={{ width: stamp, height: stamp, borderRadius: stamp * 0.28 }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <Text weight="extrabold" className={size === 'sm' ? 'text-lg' : 'text-xl'} style={{ letterSpacing: -0.4 }}>
        IELTS
        <Text weight="black" className="text-accent-deep">
          Path
        </Text>
      </Text>
    </View>
  );
}
