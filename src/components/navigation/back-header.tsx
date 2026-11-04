import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

type BackButtonProps = {
  onBack?: () => void;
  fallbackHref?: string;
  label?: string;
  /** Use on tinted/hero backgrounds where the default canvas chip would vanish. */
  className?: string;
};

function goBackOrFallback(fallbackHref: string) {
  if (router.canGoBack()) router.back();
  else router.replace(fallbackHref as never);
}

/** The single back affordance for pushed screens: 44pt target, same shape everywhere. */
export function BackButton({ onBack, fallbackHref = '/(tabs)', label = 'Quay lại', className }: BackButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onBack ?? (() => goBackOrFallback(fallbackHref))}
      className={`h-11 w-11 items-center justify-center rounded-full border border-line bg-surface active:opacity-70 ${className ?? ''}`}>
      <ArrowLeft size={20} color={colors.ink} strokeWidth={2.2} />
    </Pressable>
  );
}

type BackHeaderProps = {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  fallbackHref?: string;
  rightAction?: ReactNode;
  backLabel?: string;
};

/** Top bar for pushed screens. Owns the status-bar inset so content never sits under it. */
export function BackHeader({ title, subtitle, onBack, fallbackHref = '/(tabs)', rightAction, backLabel }: BackHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="border-b border-line bg-surface" style={{ paddingTop: insets.top }}>
      <View className="min-h-[58px] flex-row items-center gap-3 px-4 py-2">
        <BackButton onBack={onBack} fallbackHref={fallbackHref} label={backLabel} className="border-0 bg-canvas" />
        {title ? (
          <View className="min-w-0 flex-1">
            <Text accessibilityRole="header" numberOfLines={1} weight="extrabold" className="text-base text-ink">{title}</Text>
            {subtitle ? <Text numberOfLines={1} className="mt-0.5 text-xs text-muted">{subtitle}</Text> : null}
          </View>
        ) : <View className="flex-1" />}
        {rightAction}
      </View>
    </View>
  );
}
