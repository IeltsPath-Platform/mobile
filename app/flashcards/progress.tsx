import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { memo, useCallback, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { FlashcardSignIn, QueryState } from '@/src/features/flashcards/components/query-state';
import {
  ReviewAchievementsPanel,
  VocabularyMapPanel,
} from '@/src/features/flashcards/components/progress-collapsible-panels';
import { Panel, ProgressBar } from '@/src/features/flashcards/components/progress-ui';
import { WeeklyGoalPanel } from '@/src/features/flashcards/components/weekly-goal-panel';
import { notebookApi, type TopicProgress as TopicProgressResponse } from '@/src/features/flashcards/notebook-api';
import { nextPage, useFlashcardAccess, useStudyTimezone } from '@/src/features/flashcards/queries';
import { vocabApi, type VocabularySet } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';

type TopicProgress = TopicProgressResponse['topics'][number];

const NOTEBOOK_KEY = ['flashcards', 'notebook'] as const;

export default function VocabularyProgressScreen() {
  const enabled = useFlashcardAccess();
  const timezone = useStudyTimezone();
  const client = useQueryClient();
  const [selectedSet, setSelectedSet] = useState<VocabularySet | null>(null);

  const summary = useQuery({
    queryKey: [...NOTEBOOK_KEY, 'summary', timezone],
    queryFn: () => notebookApi.summary(timezone),
    enabled,
  });
  const recent = useQuery({
    queryKey: [...NOTEBOOK_KEY, 'recent-result'],
    queryFn: notebookApi.recentResult,
    enabled,
  });
  const topics = useQuery({
    queryKey: [...NOTEBOOK_KEY, 'topics-progress', selectedSet?.id],
    queryFn: () => notebookApi.topicsProgress(selectedSet?.id),
    enabled,
  });

  const selectedSetId = selectedSet?.id;
  const openTopic = useCallback(
    (topic: TopicProgress) =>
      router.push({
        pathname: '/flashcards/notebook',
        params: {
          topicId: topic.topicId,
          ...(selectedSetId ? { setId: selectedSetId } : {}),
          title: topic.name,
        },
      }),
    [selectedSetId],
  );

  return (
    <View className="flex-1 bg-canvas">
      <BackHeader title="Tiến độ từ vựng" fallbackHref="/(tabs)/flashcards" />
      {!enabled ? (
        <FlashcardSignIn />
      ) : (
        <FlatList
          data={topics.data?.topics ?? []}
          keyExtractor={(topic) => topic.topicId}
          contentContainerClassName="px-5 pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshing={topics.isRefetching || summary.isRefetching}
          onRefresh={() => {
            void client.invalidateQueries({ queryKey: NOTEBOOK_KEY });
            void client.invalidateQueries({ queryKey: ['vocab', 'achievements'] });
          }}
          ListHeaderComponent={
            <View>
              <Panel>
                <Text weight="bold" className="text-lg">
                  Sổ từ của bạn
                </Text>
                <QueryState pending={summary.isPending} error={summary.error} retry={() => void summary.refetch()} />
                {summary.data ? (
                  <>
                    <View className="flex-row gap-2">
                      <View className="flex-1 items-center rounded-2xl bg-canvas py-3">
                        <Text weight="black" className="text-2xl text-accent-deep">
                          {summary.data.total}
                        </Text>
                        <Text className="mt-0.5 text-xs text-muted">Từ đã lưu</Text>
                      </View>
                      <View
                        className="flex-1 items-center rounded-2xl py-3"
                        style={{ backgroundColor: colors.successSoft }}
                      >
                        <Text weight="black" className="text-2xl" style={{ color: colors.success }}>
                          {summary.data.masteredCount}
                        </Text>
                        <Text className="mt-0.5 text-xs text-muted">Đã thuộc</Text>
                      </View>
                      <View
                        className="flex-1 items-center rounded-2xl py-3"
                        style={{ backgroundColor: colors.accentSoft }}
                      >
                        <Text weight="black" className="text-2xl text-accent-deep">
                          {summary.data.dueNow}
                        </Text>
                        <Text className="mt-0.5 text-xs text-muted">Cần ôn</Text>
                      </View>
                    </View>
                    <Text className="text-sm text-muted">
                      Hôm nay: {summary.data.reviewedToday} lượt ôn · 7 ngày qua: +{summary.data.addedLast7Days} từ
                    </Text>
                  </>
                ) : null}
              </Panel>

              <WeeklyGoalPanel timezone={timezone} />

              <Panel>
                <Text weight="bold">Lượt ôn gần nhất</Text>
                <QueryState pending={recent.isPending} error={recent.error} retry={() => void recent.refetch()} />
                {recent.data ? (
                  <>
                    <View className="flex-row items-center justify-between">
                      <Text weight="semibold">{recent.data.topic || 'Ôn thẻ từ'}</Text>
                      <View
                        className="rounded-full px-2.5 py-1"
                        style={{
                          backgroundColor: recent.data.percent >= 80 ? colors.successSoft : colors.accentSoft,
                        }}
                      >
                        <Text
                          weight="bold"
                          className="text-xs"
                          style={{ color: recent.data.percent >= 80 ? colors.success : colors.accentDeep }}
                        >
                          {recent.data.percent}%
                        </Text>
                      </View>
                    </View>
                    <Text className="text-sm text-muted">
                      {recent.data.correct}/{recent.data.total} đúng ·{' '}
                      {new Date(recent.data.finishedAt).toLocaleString('vi-VN', { timeZone: timezone })}
                    </Text>
                    <ProgressBar
                      value={recent.data.correct}
                      max={recent.data.total}
                      color={recent.data.percent >= 80 ? colors.success : colors.accent}
                    />
                  </>
                ) : recent.isSuccess ? (
                  <Text className="text-sm text-muted">Chưa có lượt ôn được ghi nhận.</Text>
                ) : null}
              </Panel>

              <VocabularyMapPanel />
              <ReviewAchievementsPanel timezone={timezone} />

              <Panel>
                <Text weight="bold" className="text-base">
                  Tiến độ theo chủ đề
                </Text>
                <Text className="text-sm text-muted">Tính từ lịch sử ôn và mức độ ghi nhớ trong sổ từ.</Text>
                <SetFilter selectedSet={selectedSet} onSelect={setSelectedSet} />
                {selectedSet ? <SetProgressCard set={selectedSet} /> : null}
                <QueryState pending={topics.isPending} error={topics.error} retry={() => void topics.refetch()} />
              </Panel>
            </View>
          }
          renderItem={({ item }) => <TopicRow topic={item} onPress={openTopic} />}
          ListEmptyComponent={
            topics.isSuccess ? (
              <Text className="py-5 text-center text-muted">Chưa có dữ liệu chủ đề.</Text>
            ) : undefined
          }
        />
      )}
    </View>
  );
}

function SetFilter({
  selectedSet,
  onSelect,
}: {
  selectedSet: VocabularySet | null;
  onSelect: (set: VocabularySet | null) => void;
}) {
  const enabled = useFlashcardAccess();
  const [open, setOpen] = useState(false);
  const sets = useInfiniteQuery({
    queryKey: ['vocab', 'sets', 'all'],
    queryFn: ({ pageParam, signal }) => vocabApi.listSets(undefined, pageParam, 30, signal),
    initialPageParam: 0,
    getNextPageParam: nextPage,
    enabled: enabled && open,
    staleTime: 300_000,
  });

  const choose = (set: VocabularySet | null) => {
    onSelect(set);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Lọc theo bộ từ: ${selectedSet ? selectedSet.title : 'Tất cả chủ đề'}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        className="min-h-11 flex-row items-center justify-between rounded-2xl border border-line px-3"
      >
        <Text className="text-sm">{selectedSet ? selectedSet.title : 'Tất cả chủ đề'}</Text>
        <ChevronDown
          size={16}
          color={colors.muted}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {open ? (
        <View className="rounded-2xl border border-line bg-canvas">
          <Pressable
            accessibilityRole="button"
            onPress={() => choose(null)}
            className="min-h-11 justify-center border-b border-line px-3"
          >
            <Text weight="bold" className="text-accent-deep">
              Tất cả chủ đề
            </Text>
          </Pressable>
          <QueryState pending={sets.isPending} error={sets.error} retry={() => void sets.refetch()} />
          {sets.data?.pages
            .flatMap((page) => page.items)
            .map((set) => (
              <Pressable
                key={set.id}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedSet?.id === set.id }}
                onPress={() => choose(set)}
                className="min-h-11 justify-center border-b border-line px-3 py-2 last:border-b-0"
              >
                <Text style={{ color: selectedSet?.id === set.id ? colors.accentDeep : colors.ink }}>
                  {set.title}
                </Text>
              </Pressable>
            ))}
          {sets.hasNextPage ? (
            <Button
              label="Thêm bộ từ"
              variant="ghost"
              loading={sets.isFetchingNextPage}
              onPress={() => void sets.fetchNextPage()}
            />
          ) : null}
        </View>
      ) : null}
    </>
  );
}

function SetProgressCard({ set }: { set: VocabularySet }) {
  const setProgress = useQuery({
    queryKey: [...NOTEBOOK_KEY, 'set-progress', set.id],
    queryFn: () => notebookApi.setProgress(set.id),
  });

  return (
    <>
      <QueryState
        pending={setProgress.isPending}
        error={setProgress.error}
        retry={() => void setProgress.refetch()}
      />
      {setProgress.data ? (
        <View className="gap-2 rounded-2xl bg-canvas p-3">
          <View className="flex-row items-center justify-between">
            <Text weight="semibold">{set.title}</Text>
            <Text weight="bold" className="text-accent-deep">
              {setProgress.data.percent}%
            </Text>
          </View>
          <ProgressBar value={setProgress.data.learned} max={setProgress.data.total} />
          <Text className="text-xs text-muted">
            Đã học {setProgress.data.learned}/{setProgress.data.total} · Đang học {setProgress.data.learning} · Cần
            ôn {setProgress.data.needsReview}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: '/flashcards/notebook',
                params: { setId: set.id, title: set.title },
              })
            }
            className="mt-1 min-h-11 justify-center"
          >
            <Text weight="bold" className="text-sm text-accent-deep">
              Xem từ đã lưu →
            </Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );
}

const TopicRow = memo(function TopicRow({
  topic,
  onPress,
}: {
  topic: TopicProgress;
  onPress: (topic: TopicProgress) => void;
}) {
  const done = topic.percent >= 100;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${topic.name}, ${topic.percent}%`}
      onPress={() => onPress(topic)}
      className="mb-3 gap-2 rounded-3xl border border-line bg-surface p-4"
    >
      <View className="flex-row items-center justify-between">
        <Text weight="bold" className="mr-2 flex-1" numberOfLines={1}>
          {topic.name}
        </Text>
        <Text weight="bold" className="text-sm" style={{ color: done ? colors.success : colors.accentDeep }}>
          {topic.percent}%
        </Text>
      </View>
      <Text className="text-sm text-muted">
        {topic.learned}/{topic.total} từ đã học
      </Text>
      <ProgressBar value={topic.learned} max={topic.total} color={done ? colors.success : colors.accent} />
    </Pressable>
  );
});
