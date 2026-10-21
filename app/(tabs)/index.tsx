import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect, type Href } from 'expo-router';
import { ChevronRight, UserRound } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { learningApi } from '@/src/features/learning';
import type { TopicLessonsDto } from '@/src/features/learning/types';
import { LearningPath } from '@/src/features/practice/components/learning-path';
import { LessonSheet } from '@/src/features/practice/components/lesson-sheet';
import { ProgressSummary } from '@/src/features/progress/progress-summary';
import { useCurrentUser } from '@/src/features/auth/auth-provider';
import {
  clonePathUnits,
  completePathNode,
  findCurrentNode,
  flattenNodes,
  mapLessonsToPathUnits,
  type PathNode,
  type PathUnit,
} from '@/src/features/practice/path';
import { SESSION_DONE_KEY, type SessionDone } from '@/src/features/session/completion';
import { USE_MOCK_LEARNING } from '@/src/lib/env';
import { colors } from '@/src/theme';

export default function HomeScreen() {
  const user = useCurrentUser();
  const httpMode = !USE_MOCK_LEARNING;
  const queryClient = useQueryClient();
  const [mockUnits, setMockUnits] = useState(() => clonePathUnits());
  const [selected, setSelected] = useState<PathNode | null>(null);
  const [mascotNodeId, setMascotNodeId] = useState<string | null>(
    () => findCurrentNode(clonePathUnits())?.id ?? null,
  );
  const [travelToNodeId, setTravelToNodeId] = useState<string | null>(null);
  const [pendingUnlock, setPendingUnlock] = useState<string | null>(null);

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

  const current = useMemo(() => findCurrentNode(units), [units]);
  const activeUnit = useMemo(() => {
    if (current) return units.find((unit) => unit.nodes.some((node) => node.id === current.id)) ?? units[0] ?? null;
    return units[0] ?? null;
  }, [units, current]);

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
      queryClient.setQueryData<number>(['progress', 'sessionXp'], (xp) => (xp ?? 0) + payload.xp);
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
      <ScrollView contentContainerClassName="px-5 pb-8 pt-4" showsVerticalScrollIndicator={false}>
        <View className="mb-1 flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text weight="semibold" className="text-sm text-muted">HÔM NAY</Text>
            <Text weight="black" className="mt-1 text-2xl leading-8">Chào {user.data?.fullName?.split(' ')[0] ?? 'bạn'} 👋</Text>
            <Text className="mt-1 text-sm text-muted">Mình cùng tiến thêm một bước nhé.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Mở hồ sơ" onPress={() => router.push('/(tabs)/account' as never)} className="h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface">
            {user.data?.fullName ? <Text weight="extrabold" className="text-lg text-accent">{user.data.fullName.trim().charAt(0).toUpperCase()}</Text> : <UserRound size={21} color={colors.accentDeep} />}
          </Pressable>
        </View>
        <ProgressSummary compact />

        {waiting ? (
          <View className="mt-10 items-center">
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        {!waiting && activeUnit ? (
          <View className="mb-5 mt-1 rounded-3xl border border-line bg-surface px-4 py-4">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <Text weight="bold" className="text-xs uppercase tracking-wide text-muted">
                  {activeUnit.label}
                </Text>
                <Text weight="black" className="mt-1 text-xl leading-7">
                  {activeUnit.title}
                </Text>
              </View>
              <View className="rounded-full bg-accent-soft px-3 py-1.5">
                <Text weight="extrabold" className="text-xs text-accent-deep">
                  {Math.round(activeUnit.progress * 100)}%
                </Text>
              </View>
            </View>
            <View className="mt-4 h-2 overflow-hidden rounded-full bg-canvas">
              <View
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.max(0, Math.min(100, Math.round(activeUnit.progress * 100)))}%` }}
              />
            </View>
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-xs text-muted">Tiếp tục lộ trình của bạn</Text>
              <ChevronRight size={15} color={colors.muted} />
            </View>
          </View>
        ) : null}

        {!waiting ? (
          <View>
          <View className="mb-2 flex-row items-end justify-between">
            <View><Text weight="black" className="text-xl">Lộ trình học</Text><Text className="mt-1 text-sm text-muted">Học đều mỗi ngày, vững vàng từng bước.</Text></View>
          </View>
          <LearningPath
            units={units}
            onSelectNode={setSelected}
            mascotNodeId={mascotNodeId}
            travelToNodeId={travelToNodeId}
            onMascotArrived={onMascotArrived}
            quietUnitId={activeUnit?.id ?? null}
          />
          </View>
        ) : null}
      </ScrollView>

      <LessonSheet node={selected} visible={selected != null} onClose={() => setSelected(null)} onStart={startLesson} />
    </View>
  );
}
