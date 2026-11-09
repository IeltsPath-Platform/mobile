import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

import { Text } from './text';

type StatTone = 'accent' | 'success' | 'xp';

/**
 * Labelled number on the lesson summary: a coloured title strip over a framed value.
 * `children` replaces the plain value (e.g. a CountUp); `value` is still used for the screen-reader label.
 */
export function StatCard({
  label,
  value,
  tone = 'accent',
  icon: Icon,
  children,
}: {
  label: string;
  value?: string;
  tone?: StatTone;
  icon?: LucideIcon;
  children?: ReactNode;
}) {
  useTheme();
  const color = tone === 'success' ? colors.success : tone === 'xp' ? colors.xpDeep : colors.accentDeep;
  const fill = tone === 'success' ? colors.success : tone === 'xp' ? colors.xp : colors.accent;
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value ?? ''}`.trim()}
      className="flex-1 overflow-hidden rounded-2xl"
      style={{ backgroundColor: fill }}>
      <View className="items-center py-1.5">
        <Text weight="black" numberOfLines={1} className="text-[11px] uppercase tracking-wider" style={{ color: tone === 'xp' ? '#3b2a00' : colors.canvas }}>
          {label}
        </Text>
      </View>
      <View
        className="items-center justify-center gap-1 py-3"
        style={{ backgroundColor: colors.surface, margin: 2, borderRadius: 14 }}>
        {Icon ? <Icon size={22} color={color} fill={tone === 'xp' ? color : 'transparent'} /> : null}
        {children ?? (
          <Text weight="black" className="text-2xl" style={{ color }}>
            {value}
          </Text>
        )}
      </View>
    </View>
  );
}
