import { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { LearningPath } from '@/src/features/practice/components/learning-path';
import { LessonSheet } from '@/src/features/practice/components/lesson-sheet';
import { StreakBar } from '@/src/features/practice/components/streak-bar';
import {
  clonePathUnits,
  completePathNode,
  findCurrentNode,
  flattenNodes,
  learnerStats,
  type PathNode,
} from '@/src/features/practice/path';
import { useStreak } from '@/src/features/progress/use-streak';
import { useAppSettings } from '@/src/features/settings/use-app-settings';
import { colors } from '@/src/theme';

export default function HomeScreen() {
  const [units, setUnits] = useState(() => clonePathUnits());
  const [selected, setSelected] = useState<PathNode | null>(null);
  const [mascotNodeId, setMascotNodeId] = useState<string | null>(
    () => findCurrentNode(clonePathUnits())?.id ?? null,
  );
  const [travelToNodeId, setTravelToNodeId] = useState<string | null>(null);
  const [bonusXp, setBonusXp] = useState(0);

  const { currentDays } = useStreak();
  const { settings } = useAppSettings();
  const dailyGoal = settings.dailyXpGoal;
  const current = useMemo(() => findCurrentNode(units), [units]);

  const startLesson = (nodeId: string) => {
    const node = flattenNodes(units).find((item) => item.id === nodeId);
    const message = node ? `Sắp luyện: ${node.title}.` : 'Phiên luyện sẽ mở trong bản tới.';
    if (Platform.OS === 'web') {
      window.alert(message);
      return;
    }
    Alert.alert('Bắt đầu luyện', message, [{ text: 'OK' }]);
  };

  const completeLesson = useCallback(
    (nodeId: string) => {
      if (travelToNodeId) return;
      const node = flattenNodes(units).find((item) => item.id === nodeId);
      const { units: nextUnits, nextNodeId } = completePathNode(units, nodeId);
      setUnits(nextUnits);
      setBonusXp((xp) => xp + (node?.xp ?? 0));
      setMascotNodeId(nodeId);
      if (nextNodeId) {
        // Remeasure then travel — slight delay so layouts settle after status change
        setTimeout(() => setTravelToNodeId(nextNodeId), 120);
      }
    },
    [travelToNodeId, units],
  );

  const onMascotArrived = useCallback(() => {
    setTravelToNodeId((target) => {
      if (target) setMascotNodeId(target);
      return null;
    });
  }, []);

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView contentContainerClassName="px-5 pb-28 pt-4" showsVerticalScrollIndicator={false}>
        <StreakBar
          streak={currentDays}
          xp={learnerStats.xp + bonusXp}
          dailyXp={Math.min(dailyGoal, learnerStats.dailyXp + bonusXp)}
          dailyGoal={dailyGoal}
        />

        {current ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Bắt đầu ${current.title}, cộng ${current.xp} XP`}
            onPress={() => setSelected(current)}
            className="mt-5 overflow-hidden rounded-3xl border border-b-4 active:translate-y-0.5"
            style={{
              borderColor: `${current.color}55`,
              borderBottomColor: current.color,
              backgroundColor: colors.surface,
            }}>
            <View className="h-1.5" style={{ backgroundColor: current.color }} />
            <View className="flex-row items-center gap-3 px-4 py-4">
              <View
                className="h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: current.color }}>
                <current.Icon size={26} color="#fff" />
              </View>
              <View className="flex-1">
                <Text weight="bold" className="text-xs uppercase tracking-wide text-accent-deep">
                  Bài tiếp theo
                </Text>
                <Text weight="black" className="mt-0.5 text-lg leading-6">
                  {current.title}
                </Text>
                <Text className="mt-0.5 text-sm text-muted">{current.subtitle}</Text>
              </View>
              <View className="rounded-2xl px-3 py-2" style={{ backgroundColor: current.color }}>
                <Text weight="extrabold" className="text-sm text-white">
                  Bắt đầu
                </Text>
              </View>
            </View>
          </Pressable>
        ) : null}

        <View className="mt-7">
          <LearningPath
            units={units}
            onSelectNode={setSelected}
            mascotNodeId={mascotNodeId}
            travelToNodeId={travelToNodeId}
            onMascotArrived={onMascotArrived}
          />
        </View>
      </ScrollView>

      {current ? (
        <View className="absolute bottom-0 left-0 right-0 border-t border-line bg-surface px-5 pb-5 pt-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Bắt đầu ${current.title}`}
            onPress={() => setSelected(current)}
            className="h-14 flex-row items-center justify-center gap-2 rounded-2xl border border-accent-edge border-b-4 bg-accent active:translate-y-0.5">
            <current.Icon size={22} color="#fff" />
            <Text weight="extrabold" className="text-base text-white">
              Bắt đầu · +{current.xp} XP
            </Text>
          </Pressable>
        </View>
      ) : null}

      <LessonSheet
        node={selected}
        visible={selected != null}
        onClose={() => setSelected(null)}
        onStart={startLesson}
        onComplete={completeLesson}
      />
    </View>
  );
}
