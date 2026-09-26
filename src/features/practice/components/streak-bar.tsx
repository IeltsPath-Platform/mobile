import { Flame, Gem, Zap } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

type StreakBarProps = {
  streak: number;
  xp: number;
  dailyXp: number;
  dailyGoal: number;
};

export function StreakBar({ streak, xp, dailyXp, dailyGoal }: StreakBarProps) {
  const progress = Math.min(1, dailyXp / dailyGoal);

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-2">
        <StatChip
          icon={<Flame size={18} color={colors.accentWarm} fill={colors.accentWarm} />}
          label={`${streak}`}
          hint="streak"
          tint={colors.accentWarm}
        />
        <StatChip icon={<Zap size={18} color={colors.xpDeep} fill={colors.xp} />} label={`${xp}`} hint="XP" tint={colors.xpDeep} />
        <StatChip icon={<Gem size={18} color={colors.skill.listening} />} label="3" hint="hạng" tint={colors.skill.listening} />
      </View>

      <View className="rounded-2xl border border-line bg-surface px-3 py-2.5">
        <View className="mb-1.5 flex-row items-center justify-between">
          <Text weight="bold" className="text-xs text-muted">
            Mục tiêu hôm nay
          </Text>
          <Text weight="extrabold" className="text-xs text-accent-deep">
            {dailyXp}/{dailyGoal} XP
          </Text>
        </View>
        <View className="h-3 overflow-hidden rounded-full bg-line">
          <View className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
        </View>
      </View>
    </View>
  );
}

function StatChip({
  icon,
  label,
  hint,
  tint,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  tint: string;
}) {
  return (
    <View
      className="min-h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl border border-b-4 bg-surface px-2"
      style={{ borderColor: `${tint}33`, borderBottomColor: `${tint}55` }}
      accessibilityLabel={`${label} ${hint}`}>
      {icon}
      <View>
        <Text weight="black" className="text-base leading-5" style={{ color: tint }}>
          {label}
        </Text>
        <Text weight="bold" className="text-[10px] uppercase tracking-wide text-muted">
          {hint}
        </Text>
      </View>
    </View>
  );
}
