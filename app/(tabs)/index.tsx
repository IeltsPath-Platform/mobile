import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { learningApi } from '@/src/features/learning';
import type { TopicLessonsDto } from '@/src/features/learning/types';
import { LearningPath } from '@/src/features/practice/components/learning-path';
import { LessonSheet } from '@/src/features/practice/components/lesson-sheet';
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
      <ScrollView contentContainerClassName="px-4 pb-8 pt-5" showsVerticalScrollIndicator={false}>
        {waiting ? (
          <View className="mt-10 items-center">
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        {!waiting && activeUnit ? (
          <View className="mb-1 px-2">
            <Text weight="bold" className="text-xs text-muted">
              {activeUnit.label}
            </Text>
            <View className="mt-0.5 flex-row items-end justify-between gap-3">
              <Text weight="black" className="flex-1 text-xl leading-7">
                {activeUnit.title}
              </Text>
              <Text weight="extrabold" className="text-sm text-xp">
                {Math.round(activeUnit.progress * 100)}%
              </Text>
            </View>
          </View>
        ) : null}

        {!waiting ? (
          <LearningPath
            units={units}
            onSelectNode={setSelected}
            mascotNodeId={mascotNodeId}
            travelToNodeId={travelToNodeId}
            onMascotArrived={onMascotArrived}
            quietUnitId={activeUnit?.id ?? null}
          />
        ) : null}
      </ScrollView>

      <LessonSheet node={selected} visible={selected != null} onClose={() => setSelected(null)} onStart={startLesson} />
    </View>
  );
}
