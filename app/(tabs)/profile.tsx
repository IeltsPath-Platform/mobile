import { Flame, Trophy, Zap } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { RefreshControl, ScrollView, View } from 'react-native';

import { Card } from '@/src/components/ui/card';
import { Text } from '@/src/components/ui/text';
import { learnerStats, pathUnits } from '@/src/features/practice/path';
import { useStreak } from '@/src/features/progress/use-streak';
import { colors } from '@/src/theme';

const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const weekDone = [true, true, true, true, false, false, false];

export default function ProgressScreen() {
  const { currentDays, longestDays, isMock: streakMock, refetch: refetchStreak } = useStreak();
  const doneNodes = pathUnits.flatMap((unit) => unit.nodes).filter((node) => node.status === 'done').length;

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerClassName="px-5 pb-12 pt-5"
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={() => {
            void refetchStreak();
          }}
          tintColor={colors.accentDeep}
        />
      }>
      <Text weight="bold" className="text-xs uppercase tracking-widest text-accent-deep">
        Tiến độ
      </Text>
      <Text weight="black" className="mt-1.5 text-3xl leading-10" style={{ letterSpacing: -0.8 }}>
        Streak & XP
      </Text>

      <View className="mt-5 flex-row gap-3">
        <StatTile Icon={Flame} color={colors.accentWarm} value={`${currentDays}`} label="Ngày liên tiếp" />
        <StatTile Icon={Zap} color={colors.xpDeep} value={`${learnerStats.xp}`} label="Tổng XP" />
        <StatTile Icon={Trophy} color={colors.skill.listening} value={`${doneNodes}`} label="Node xong" />
      </View>
      {!streakMock ? (
        <Text className="mt-2 text-xs text-muted">Kỷ lục streak: {longestDays} ngày</Text>
      ) : null}

      <Card className="mt-4">
        <Text weight="extrabold" className="text-base">
          Tuần này
        </Text>
        <View className="mt-3 flex-row justify-between">
          {weekDays.map((day, index) => (
            <View key={day} className="items-center gap-1.5">
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: weekDone[index] ? colors.accent : colors.line }}>
                {weekDone[index] ? (
                  <Flame size={16} color="#fff" fill="#fff" />
                ) : (
                  <Text weight="bold" className="text-xs text-muted">
                    {day}
                  </Text>
                )}
              </View>
              <Text weight="bold" className="text-[10px] text-muted">
                {day}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

function StatTile({
  Icon,
  color,
  value,
  label,
}: {
  Icon: LucideIcon;
  color: string;
  value: string;
  label: string;
}) {
  return (
    <View className="flex-1 items-center rounded-3xl border border-line border-b-4 border-b-edge bg-surface px-2 py-3">
      <Icon size={20} color={color} />
      <Text weight="black" className="mt-1 text-xl" style={{ color }}>
        {value}
      </Text>
      <Text weight="bold" className="text-center text-[10px] text-muted">
        {label}
      </Text>
    </View>
  );
}
