import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from './text';

/** Friendly placeholder for empty / error lists. Optional `action` renders below the copy. */
export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <View className="items-center rounded-3xl border border-line bg-surface px-6 py-8">
      <Image
        source={require('@/assets/images/owl/nav-owl-stand.webp')}
        accessibilityIgnoresInvertColors
        contentFit="contain"
        style={{ width: 72, height: 72 }}
      />
      <Text accessibilityRole="header" weight="bold" className="mt-3 text-center text-base">
        {title}
      </Text>
      {message ? <Text className="mt-1.5 text-center text-sm leading-5 text-muted">{message}</Text> : null}
      {action ? <View className="mt-4 w-full">{action}</View> : null}
    </View>
  );
}
