import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

type BackHeaderProps = {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  fallbackHref?: string;
  rightAction?: ReactNode;
};

/** Compact, consistent back navigation for pushed screens. */
export function BackHeader({ title, subtitle, onBack, fallbackHref = '/(tabs)', rightAction }: BackHeaderProps) {
  const goBack = onBack ?? (() => {
    if (router.canGoBack()) router.back();
    else router.replace(fallbackHref as never);
  });

  return (
    <View className="min-h-[58px] flex-row items-center gap-3 border-b border-line bg-surface px-4 py-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        accessibilityHint="Trở về màn hình trước"
        hitSlop={6}
        onPress={goBack}
        className="h-11 w-11 items-center justify-center rounded-2xl bg-canvas active:opacity-70">
        <ArrowLeft size={20} color={colors.ink} strokeWidth={2.2} />
      </Pressable>
      {title ? (
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} weight="extrabold" className="text-base text-ink">{title}</Text>
          {subtitle ? <Text numberOfLines={1} className="mt-0.5 text-xs text-muted">{subtitle}</Text> : null}
        </View>
      ) : <View className="flex-1" />}
      {rightAction}
    </View>
  );
}
