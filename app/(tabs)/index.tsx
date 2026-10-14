import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { learningApi } from '@/src/features/learning';
import type { TopicLessonsDto } from '@/src/features/learning/types';
import { LearningPath } from '@/src/features/practice/components/learning-path';
import { LessonSheet } from '@/src/features/practice/components/lesson-sheet';
import { StreakBar } from '@/src/features/practice/components/streak-bar';
import {
  clonePathUnits,
  completePathNode,
  findCurrentNode,
  flattenNodes,
  learnerStats,
  mapLessonsToPathUnits,
  type PathNode,
  type PathUnit,
} from '@/src/features/practice/path';
import { SESSION_DONE_KEY, type SessionDone } from '@/src/features/session/completion';
import { useStreak } from '@/src/features/progress/use-streak';
import { useAppSettings } from '@/src/features/settings/use-app-settings';
import { USE_MOCK_LEARNING } from '@/src/lib/env';
import { colors } from '@/src/theme';

export default function HomeScreen() {
  const httpMode = !USE_MOCK_LEARNING;
  const queryClient = useQueryClient();
  const [mockUnits, setMockUnits] = useState(() => clonePathUnits());
  const [selected, setSelected] = useState<PathNode | null>(null);
  const [mascotNodeId, setMascotNodeId] = useState<string | null>(
    () => findCurrentNode(clonePathUnits())?.id ?? null,
  );
  const [travelToNodeId, setTravelToNodeId] = useState<string | null>(null);
  const [pendingUnlock, setPendingUnlock] = useState<string | null>(null);
  const [bonusXp, setBonusXp] = useState(0);

  const topicsQuery = useQuery({
    queryKey: ['learning', 'topics'],
    queryFn: () => learningApi.listTopics(),
    enabled: httpMode,
  });

  const topicIds = useMemo(
    () => (httpMode ? (topicsQuery.data ?? []).filter((topic) => topic.status !== 'LOCKED').map((topic) => topic.topicId) : []),
    [httpMode, topicsQuery.data],
  );

  const lessonQueries = useQueries({
    queries: topicIds.map((topicId) => ({
      queryKey: ['learning', 'topic', topicId, 'lessons'],
      queryFn: () => learningApi.getTopicLessons(topicId),
    })),
  });

  const lessonSignature = lessonQueries
    .map((query) => (query.data ? query.data.lessons.map((lesson) => `${lesson.lessonId}:${lesson.status}`).join(',') : query.status))
    .join('|');

  const mapped = useMemo(() => {
    const loaded = lessonQueries
      .map((query) => query.data)
      .filter((dto): dto is TopicLessonsDto => Boolean(dto));
    const byTopic = Object.fromEntries(loaded.map((dto) => [dto.topicId, dto.lessons]));
    return mapLessonsToPathUnits(topicsQuery.data ?? [], byTopic);
    // lessonQueries identity changes every render; signature captures payload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicsQuery.data, lessonSignature]);

  const lessonsPending = topicIds.length > 0 && lessonQueries.some((query) => query.isPending);
  const lessonsFailed = lessonQueries.some((query) => query.isError);
  const waiting = httpMode && (topicsQuery.isPending || (topicsQuery.isSuccess && lessonsPending));
  const failed = httpMode && (topicsQuery.isError || lessonsFailed);
  const usingMockPath = !httpMode || failed || (topicsQuery.isSuccess && !waiting && mapped.length === 0);
  const units: PathUnit[] = usingMockPath ? mockUnits : mapped;

  const usingMockRef = useRef(usingMockPath);
  usingMockRef.current = usingMockPath;
  const mockUnitsRef = useRef(mockUnits);
  mockUnitsRef.current = mockUnits;
  const travelRef = useRef(travelToNodeId);
  travelRef.current = travelToNodeId;

  const { currentDays } = useStreak();
  const { settings } = useAppSettings();
  const dailyGoal = settings.dailyXpGoal;
  const current = useMemo(() => findCurrentNode(units), [units]);

  useEffect(() => {
    if (travelToNodeId || pendingUnlock) return;
    setMascotNodeId((id) => id ?? findCurrentNode(units)?.id ?? null);
  }, [units, travelToNodeId, pendingUnlock]);

  useEffect(() => {
    if (!pendingUnlock || usingMockPath) return;
    const next = findCurrentNode(units);
    if (!next) {
      setPendingUnlock(null);
      return;
    }
    if (next.id === pendingUnlock) return;
    const from = pendingUnlock;
    setPendingUnlock(null);
    setMascotNodeId(from);
    const timer = setTimeout(() => setTravelToNodeId(next.id), 120);
    return () => clearTimeout(timer);
  }, [pendingUnlock, units, usingMockPath]);

  useFocusEffect(
    useCallback(() => {
      const payload = queryClient.getQueryData<SessionDone>(SESSION_DONE_KEY);
      if (!payload?.lessonCompleted) return;
      queryClient.removeQueries({ queryKey: SESSION_DONE_KEY, exact: true });
      if (travelRef.current) return;
      setBonusXp((xp) => xp + payload.xp);
      setSelected(null);

      if (usingMockRef.current) {
        const { units: nextUnits, nextNodeId } = completePathNode(mockUnitsRef.current, payload.nodeId);
        setMockUnits(nextUnits);
        setMascotNodeId(payload.nodeId);
        if (nextNodeId) setTimeout(() => setTravelToNodeId(nextNodeId), 120);
        return;
      }

      setMascotNodeId(payload.nodeId);
      setPendingUnlock(payload.nodeId);
      void queryClient.invalidateQueries({ queryKey: ['learning'] });
    }, [queryClient]),
  );

  const startLesson = (nodeId: string) => {
    const node = flattenNodes(units).find((item) => item.id === nodeId);
    router.push({
      pathname: '/learn/session/[lessonId]',
      params: { lessonId: nodeId, xp: String(node?.xp ?? 20) },
    } as unknown as Href);
  };

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

        {usingMockPath ? (
          <Text className="mt-3 text-xs text-muted">
            {failed ? 'Không tải được lộ trình. Đang hiện bản mẫu.' : 'Đang xem lộ trình mẫu.'}
          </Text>
        ) : null}

        {waiting ? (
          <View className="mt-10 items-center">
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        {!waiting && current ? (
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

        {!waiting ? (
          <View className="mt-7">
            <LearningPath
              units={units}
              onSelectNode={setSelected}
              mascotNodeId={mascotNodeId}
              travelToNodeId={travelToNodeId}
              onMascotArrived={onMascotArrived}
            />
          </View>
        ) : null}
      </ScrollView>

      {!waiting && current ? (
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

      <LessonSheet node={selected} visible={selected != null} onClose={() => setSelected(null)} onStart={startLesson} />
    </View>
  );
}
