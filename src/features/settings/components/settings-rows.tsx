import { ChevronDown, ChevronRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Switch, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mb-4">
      <Text weight="black" className="mb-1.5 ml-2 text-[10px] uppercase tracking-wider text-muted">
        {title}
      </Text>
      <View className="overflow-hidden rounded-2xl border border-line bg-surface">{children}</View>
    </View>
  );
}

/** Collapsed-by-default row that reveals grouped options or switches. */
export function SettingsAccordionRow({
  icon: Icon,
  title,
  summary,
  expanded,
  onToggle,
  children,
  isLast = false,
}: {
  icon: LucideIcon;
  title: string;
  summary?: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  isLast?: boolean;
}) {
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded }}
        onPress={onToggle}
        className="min-h-[52px] flex-row items-center gap-3 px-4 py-2.5 active:bg-canvas"
      >
        <Icon size={18} color={colors.accentDeep} />
        <View className="flex-1 pr-2">
          <Text weight="bold" className="text-sm text-ink" numberOfLines={1}>
            {title}
          </Text>
          {summary ? (
            <Text className="mt-0.5 text-[11px] text-muted" numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>
        <ChevronDown
          size={16}
          color={colors.muted}
          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        />
      </Pressable>
      {expanded ? <View className="border-t border-line">{children}</View> : null}
      {!isLast ? <View className="ml-4 h-px bg-line" /> : null}
    </View>
  );
}

export function SettingsToggleItem({
  title,
  value,
  onChange,
}: {
  title: string;
  value: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <View className="min-h-[46px] flex-row items-center justify-between border-b border-line/60 px-4 py-2">
      <Text weight="medium" className="flex-1 pr-2 text-xs text-ink">
        {title}
      </Text>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.line, true: colors.accentSoft }}
        thumbColor={value ? colors.accent : colors.muted}
      />
    </View>
  );
}

export function SettingsLinkRow({
  icon: Icon,
  title,
  badgeText,
  danger = false,
  busy = false,
  isLast = false,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  badgeText?: string;
  danger?: boolean;
  busy?: boolean;
  isLast?: boolean;
  onPress: () => void;
}) {
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: busy, busy }}
        disabled={busy}
        onPress={onPress}
        className="min-h-[50px] flex-row items-center gap-3 px-4 py-2.5 active:bg-canvas"
      >
        <Icon size={18} color={danger ? colors.danger : colors.accentDeep} />
        <Text
          weight="bold"
          className="flex-1 text-sm text-ink"
          style={danger ? { color: colors.danger } : undefined}
        >
          {title}
        </Text>
        {badgeText ? (
          <View className="rounded-full bg-accent-soft px-2 py-0.5">
            <Text weight="black" className="text-[10px] text-accent-deep">
              {badgeText}
            </Text>
          </View>
        ) : null}
        {busy ? (
          <ActivityIndicator color={colors.danger} size="small" />
        ) : (
          <ChevronRight size={16} color={colors.muted} />
        )}
      </Pressable>
      {!isLast ? <View className="ml-4 h-px bg-line" /> : null}
    </View>
  );
}
