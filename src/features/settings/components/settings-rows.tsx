import { ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Switch, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

/** Section heading followed by flat rows (no outer frame), like a native settings list. */
export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mb-5">
      <Text accessibilityRole="header" weight="black" className="mb-2 px-1 text-xl text-ink">
        {title}
      </Text>
      <View>{children}</View>
    </View>
  );
}

function IconBubble({ icon: Icon, danger }: { icon: LucideIcon; danger?: boolean }) {
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: danger ? colors.dangerSoft : colors.accentSoft,
      }}>
      <Icon size={20} color={danger ? colors.danger : colors.accentDeep} />
    </View>
  );
}

/** Collapsed-by-default row that reveals grouped options or switches. */
export function SettingsAccordionRow({
  icon,
  title,
  summary,
  expanded,
  onToggle,
  children,
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
        className="min-h-[60px] flex-row items-center gap-3 px-1 py-2 active:opacity-70">
        <IconBubble icon={icon} />
        <View className="flex-1 pr-2">
          <Text weight="bold" className="text-base text-ink" numberOfLines={1}>
            {title}
          </Text>
          {summary ? (
            <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>
        <ChevronDown size={20} color={colors.muted} style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }} />
      </Pressable>
      {expanded ? (
        <View style={{ borderWidth: 2, borderBottomWidth: 4, borderColor: colors.line, borderBottomColor: colors.edge, borderRadius: 20, overflow: 'hidden', marginBottom: 8 }}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

export function SettingsToggleItem({
  icon: Icon,
  title,
  description,
  value,
  onChange,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  value: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <View className="min-h-16 flex-row items-center gap-3 px-4 py-3">
      {Icon ? <Icon size={22} color={colors.accentDeep} /> : null}
      <View className="flex-1">
        <Text weight="bold" className="text-base text-ink">
          {title}
        </Text>
        {description ? <Text className="mt-0.5 text-sm text-muted">{description}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.line, true: colors.accent }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.line}
      />
    </View>
  );
}

export function SettingsLinkRow({
  icon,
  title,
  value,
  badgeText,
  danger = false,
  busy = false,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  /** Current choice shown on the right, e.g. the selected theme. */
  value?: string;
  badgeText?: string;
  danger?: boolean;
  busy?: boolean;
  isLast?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${title}, ${value}` : title}
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={onPress}
      className="min-h-[60px] flex-row items-center gap-3 px-1 py-2 active:opacity-70">
      <IconBubble icon={icon} danger={danger} />
      <Text weight="bold" className="flex-1 text-base text-ink" style={danger ? { color: colors.danger } : undefined}>
        {title}
      </Text>
      {value ? (
        <Text className="text-sm text-muted" numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {badgeText ? (
        <View className="rounded-full bg-accent-soft px-2.5 py-0.5">
          <Text weight="black" className="text-xs text-accent-deep">
            {badgeText}
          </Text>
        </View>
      ) : null}
      {busy ? <ActivityIndicator color={colors.danger} size="small" /> : <ChevronRight size={20} color={colors.muted} />}
    </Pressable>
  );
}
