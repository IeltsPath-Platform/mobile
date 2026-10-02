import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { LearningPath } from '@/src/features/practice/components/learning-path';
import { LessonSheet } from '@/src/features/practice/components/lesson-sheet';
import { StreakBar } from '@/src/features/practice/components/streak-bar';
import { learnerStats, pathUnits, type PathNode } from '@/src/features/practice/path';
import { useStreak } from '@/src/features/progress/use-streak';
import { colors } from '@/src/theme';

export default function HomeScreen() {
  const [selected, setSelected] = useState<PathNode | null>(null);
  const { currentDays, isMock: streakMock } = useStreak();
  const current = useMemo(
    () => pathUnits.flatMap((unit) => unit.nodes).find((node) => node.status === 'current') ?? null,
    [],
  );

  const startLesson = (nodeId: string) => {
    const node = pathUnits.flatMap((unit) => unit.nodes).find((item) => item.id === nodeId);
    const message = node
      ? `Sắp luyện: ${node.title}. Phiên ngắn sẽ mở đầy đủ khi learning-service sẵn sàng — bạn có thể xem kho đề ngay.`
      : 'Phiên luyện sẽ mở trong bản tới.';
    if (Platform.OS === 'web') {
      window.alert(message);
      return;
    }
    Alert.alert('Bắt đầu luyện', message, [
      { text: 'Ở lại path', style: 'cancel' },
      { text: 'Mở kho đề', onPress: () => router.push('/practice') },
    ]);
  };

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView contentContainerClassName="px-5 pb-28 pt-4" showsVerticalScrollIndicator={false}>
        <View className="mb-3 self-start rounded-full bg-accent-soft px-3 py-1">
          <Text weight="bold" className="text-[11px] text-accent-deep">
            Path học · MOCK (đợi /api/learning)
            {streakMock ? ' · streak fallback' : ' · streak BE'}
          </Text>
        </View>

        <StreakBar
          streak={currentDays}
          xp={learnerStats.xp}
          dailyXp={learnerStats.dailyXp}
          dailyGoal={learnerStats.dailyGoal}
        />

        {current ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Bắt đầu ${current.title}, cộng ${current.xp} XP`}
            onPress={() => setSelected(current)}
            className="mt-5 overflow-hidden rounded-3xl border border-b-4 active:translate-y-0.5"
            style={{ borderColor: `${current.color}55`, borderBottomColor: current.color, backgroundColor: colors.surface }}>
            <View className="h-1.5" style={{ backgroundColor: current.color }} />
            <View className="flex-row items-center gap-3 px-4 py-4">
              <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: current.color }}>
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

        <Text weight="bold" className="mb-3 mt-7 text-sm text-muted">
          Path học · chạm vòng tròn đang sáng
        </Text>

        <LearningPath units={pathUnits} onSelectNode={setSelected} />
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
      />
    </View>
  );
}
