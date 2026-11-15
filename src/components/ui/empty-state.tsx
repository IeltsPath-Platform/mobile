import type { ReactNode } from 'react';
import { View } from 'react-native';

import { OwlMascot, type OwlMood } from './owl-mascot';
import { Text } from './text';

/**
 * Friendly placeholder for empty / error lists, with the owl in a matching mood.
 * `framed` draws it as a card; unframed fits inside a list that already has its own background.
 */
export function EmptyState({
  title,
  message,
  action,
  mood = 'wave',
  framed = true,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
  mood?: OwlMood;
  framed?: boolean;
}) {
  return (
    <View className={framed ? 'items-center rounded-3xl border border-line bg-surface px-6 py-8' : 'items-center px-8 pt-10'}>
      <OwlMascot mood={mood} size={framed ? 104 : 124} />
      <Text accessibilityRole="header" weight="black" className="mt-4 text-center text-lg">
        {title}
      </Text>
      {message ? <Text className="mt-1.5 text-center text-sm leading-5 text-muted">{message}</Text> : null}
      {action ? <View className="mt-5 self-stretch">{action}</View> : null}
    </View>
  );
}
