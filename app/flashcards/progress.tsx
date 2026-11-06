import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { FlashcardSignIn, QueryState } from '@/src/features/flashcards/components/query-state';
import { notebookApi } from '@/src/features/flashcards/notebook-api';
import { nextPage, useFlashcardAccess, useStudyTimezone } from '@/src/features/flashcards/queries';
import { vocabApi, type VocabularySet } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';

const achievementsLabels: Record<string, string> = {
  REVIEW_STREAK_7: 'Ôn từ 7 ngày liên tiếp',
  TOPIC_COMPLETED: 'Học hết từ trong một chủ đề',
  MASTERED_300: 'Ghi nhớ 300 từ',
};
const WEEKDAY = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function Panel({ children }: { children: React.ReactNode }) {
  return <View className="mb-4 gap-3 rounded-3xl border border-line bg-surface p-4">{children}</View>;
}

function CollapseHeader({
  label,
  open,
  onPress,
}: {
  label: string;
  open: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      className="min-h-11 flex-row items-center justify-between"
    >
      <Text weight="bold">{label}</Text>
      <ChevronDown
        size={17}
        color={colors.muted}
        style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
      />
    </Pressable>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  return (
    <View className="h-2 overflow-hidden rounded-full bg-canvas">
      <View
        className="h-full rounded-full"
        style={{ width: `${pct}%`, backgroundColor: color ?? colors.accent }}
      />
    </View>
  );
}

export default function VocabularyProgressScreen() {
  const enabled = useFlashcardAccess();
  const timezone = useStudyTimezone();
  const client = useQueryClient();
  const [goalOpen, setGoalOpen] = useState(false);
  const [target, setTarget] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [setsOpen, setSetsOpen] = useState(false);
  const [selectedSet, setSelectedSet] = useState<VocabularySet | null>(null);

  const key = ['flashcards', 'notebook'] as const;
  const summary = useQuery({ queryKey: [...key, 'summary', timezone], queryFn: () => notebookApi.summary(timezone), enabled });
  const goal = useQuery({ queryKey: [...key, 'weekly-goal', timezone], queryFn: () => notebookApi.weeklyGoal(timezone), enabled });
  const recent = useQuery({ queryKey: [...key, 'recent-result'], queryFn: notebookApi.recentResult, enabled });
  const topics = useQuery({
    queryKey: [...key, 'topics-progress', selectedSet?.id],
    queryFn: () => notebookApi.topicsProgress(selectedSet?.id),
    enabled,
  });
  const setProgress = useQuery({
    queryKey: [...key, 'set-progress', selectedSet?.id],
    queryFn: () => notebookApi.setProgress(selectedSet!.id),
    enabled: enabled && Boolean(selectedSet),
  });
  const map = useQuery({
    queryKey: [...key, 'vocabulary-map'],
    queryFn: () => notebookApi.vocabularyMap(),
    enabled: enabled && mapOpen,
  });
  const achievements = useQuery({
    queryKey: ['vocab', 'achievements', timezone],
    queryFn: () => vocabApi.achievements(timezone),
    enabled: enabled && achievementsOpen,
  });
  const sets = useInfiniteQuery({
    queryKey: ['vocab', 'sets', 'all'],
    queryFn: ({ pageParam, signal }) => vocabApi.listSets(undefined, pageParam, 30, signal),
    initialPageParam: 0,
    getNextPageParam: nextPage,
    enabled: enabled && setsOpen,
    staleTime: 300_000,
  });
  const saveGoal = useMutation({
    mutationFn: () => notebookApi.updateWeeklyGoal(Number(target), timezone),
    onSuccess: (value) => {
      client.setQueryData([...key, 'weekly-goal', timezone], value);
      setGoalOpen(false);
    },
  });
  const validTarget = /^\d+$/.test(target) && Number(target) >= 10 && Number(target) <= 1000;

  const goalPct =
    goal.data && goal.data.target > 0
      ? Math.max(0, Math.min(100, Math.round((goal.data.progress / goal.data.target) * 100)))
      : 0;

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
            void client.invalidateQueries({ queryKey: key });
            void achievements.refetch();
          }}
          ListHeaderComponent={
            <View>
              {/* ── Sổ từ tổng quan ── */}
              <Panel>
                <Text weight="bold" className="text-lg">
                  Sổ từ của bạn
                </Text>
                <QueryState pending={summary.isPending} error={summary.error} retry={() => void summary.refetch()} />
                {summary.data ? (
                  <>
                    {/* 3 chỉ số chính */}
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

              {/* ── Mục tiêu tuần ── */}
              <Panel>
                <View className="flex-row items-center justify-between">
                  <Text weight="bold" className="text-base">
                    Mục tiêu tuần
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={!goal.data}
                    onPress={() => {
                      setTarget(String(goal.data?.target ?? 50));
                      setGoalOpen(!goalOpen);
                      saveGoal.reset();
                    }}
                    className="min-h-10 justify-center px-2"
                  >
                    <Text className="text-sm text-accent-deep">{goalOpen ? 'Đóng' : 'Thay đổi'}</Text>
                  </Pressable>
                </View>
                <QueryState pending={goal.isPending} error={goal.error} retry={() => void goal.refetch()} />
                {goal.data ? (
                  <>
                    {/* Tiêu đề số */}
                    <View className="flex-row items-end justify-between">
                      <View className="flex-row items-baseline gap-1">
                        <Text weight="extrabold" className="text-3xl text-accent-deep">
                          {goal.data.progress}
                        </Text>
                        <Text className="text-base text-muted">/{goal.data.target} từ</Text>
                      </View>
                      <Text className="mb-0.5 text-sm" style={{ color: goalPct >= 100 ? colors.success : colors.muted }}>
                        {goal.data.remaining > 0 ? `Còn ${goal.data.remaining} từ` : '✓ Đạt mục tiêu!'}
                      </Text>
                    </View>
                    {/* Progress bar */}
                    <ProgressBar value={goal.data.progress} max={goal.data.target} />
                    {/* 7 ngày */}
                    <View className="flex-row justify-between pt-1">
                      {goal.data.days.map((day, index) => (
                        <View key={day.date} className="items-center gap-1">
                          <View
                            className="h-8 w-8 items-center justify-center rounded-full"
                            style={{
                              backgroundColor: day.achieved ? colors.accentSoft : colors.canvas,
                              borderWidth: day.achieved ? 0 : 1,
                              borderColor: colors.line,
                            }}
                          >
                            <Text
                              weight="bold"
                              className="text-[11px]"
                              style={{ color: day.achieved ? colors.accentDeep : colors.muted }}
                            >
                              {day.achieved ? '✓' : WEEKDAY[index]}
                            </Text>
                          </View>
                          {!day.achieved ? (
                            <Text className="text-[9px] text-muted">{WEEKDAY[index]}</Text>
                          ) : (
                            <Text className="text-[9px] text-accent-deep">{WEEKDAY[index]}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </>
                ) : null}
                {goalOpen ? (
                  <>
                    <TextInput
                      value={target}
                      onChangeText={setTarget}
                      keyboardType="number-pad"
                      maxLength={4}
                      accessibilityLabel="Mục tiêu số từ mỗi tuần"
                      className="min-h-12 rounded-2xl border border-line px-3 text-ink"
                      placeholder="Ví dụ: 50"
                      placeholderTextColor={colors.muted}
                    />
                    <Text className="text-xs text-muted">Từ 10 đến 1.000 từ mỗi tuần.</Text>
                    {saveGoal.error ? <Text className="text-sm text-danger">{saveGoal.error.message}</Text> : null}
                    <Button
                      label="Lưu mục tiêu"
                      disabled={!validTarget}
                      loading={saveGoal.isPending}
                      onPress={() => saveGoal.mutate()}
                    />
                  </>
                ) : null}
              </Panel>

              {/* ── Lượt ôn gần nhất ── */}
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

              {/* ── Bản đồ trình độ ── */}
              <Panel>
                <CollapseHeader label="Bản đồ trình độ từ vựng" open={mapOpen} onPress={() => setMapOpen(!mapOpen)} />
                {mapOpen ? (
                  <>
                    <QueryState pending={map.isPending} error={map.error} retry={() => void map.refetch()} />
                    {map.data?.suggestedBand ? (
                      <Text className="text-sm text-accent-deep">Gợi ý ôn: {map.data.suggestedBand}</Text>
                    ) : null}
                    {map.data?.bands.map((band) => (
                      <View key={band.cefr} className="gap-2 border-t border-line pt-3">
                        <View className="flex-row items-center justify-between">
                          <Text weight="bold">
                            {band.cefr} · {band.band}
                          </Text>
                          <Text className="text-xs text-muted">
                            {band.learned}/{band.total}
                          </Text>
                        </View>
                        <ProgressBar value={band.learned} max={band.total} />
                        {band.needsReview > 0 ? (
                          <Text className="text-xs text-muted">Cần ôn lại {band.needsReview} từ</Text>
                        ) : null}
                      </View>
                    ))}
                  </>
                ) : null}
              </Panel>

              {/* ── Thành tích ── */}
              <Panel>
                <CollapseHeader
                  label="Thành tích ôn từ"
                  open={achievementsOpen}
                  onPress={() => setAchievementsOpen(!achievementsOpen)}
                />
                {achievementsOpen ? (
                  <>
                    <QueryState
                      pending={achievements.isPending}
                      error={achievements.error}
                      retry={() => void achievements.refetch()}
                    />
                    {achievements.data?.items.map((item) => (
                      <View key={item.code} className="gap-2 border-t border-line pt-3">
                        <View className="flex-row items-center gap-2">
                          {item.achieved ? (
                            <View
                              className="h-6 w-6 items-center justify-center rounded-full"
                              style={{ backgroundColor: colors.successSoft }}
                            >
                              <Text className="text-xs" style={{ color: colors.success }}>
                                ✓
                              </Text>
                            </View>
                          ) : null}
                          <Text weight={item.achieved ? 'bold' : 'medium'} className="flex-1">
                            {achievementsLabels[item.code] ?? 'Thành tích từ vựng'}
                          </Text>
                        </View>
                        <ProgressBar value={item.progress} max={item.target} color={item.achieved ? colors.success : colors.accent} />
                        <Text className="text-xs text-muted">
                          {item.progress}/{item.target}
                        </Text>
                      </View>
                    ))}
                  </>
                ) : null}
              </Panel>

              {/* ── Tiến độ theo chủ đề ── */}
              <Panel>
                <Text weight="bold" className="text-base">
                  Tiến độ theo chủ đề
                </Text>
                <Text className="text-sm text-muted">Tính từ lịch sử ôn và mức độ ghi nhớ trong sổ từ.</Text>

                {/* Lọc theo bộ từ */}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSetsOpen(!setsOpen)}
                  className="min-h-11 flex-row items-center justify-between rounded-2xl border border-line px-3"
                >
                  <Text className="text-sm">{selectedSet ? selectedSet.title : 'Tất cả chủ đề'}</Text>
                  <ChevronDown
                    size={16}
                    color={colors.muted}
                    style={{ transform: [{ rotate: setsOpen ? '180deg' : '0deg' }] }}
                  />
                </Pressable>

                {setsOpen ? (
                  <View className="rounded-2xl border border-line bg-canvas">
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setSelectedSet(null);
                        setSetsOpen(false);
                      }}
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
                          onPress={() => {
                            setSelectedSet(set);
                            setSetsOpen(false);
                          }}
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

                {selectedSet ? (
                  <>
                    <QueryState
                      pending={setProgress.isPending}
                      error={setProgress.error}
                      retry={() => void setProgress.refetch()}
                    />
                    {setProgress.data ? (
                      <View className="gap-2 rounded-2xl bg-canvas p-3">
                        <View className="flex-row items-center justify-between">
                          <Text weight="semibold">{selectedSet.title}</Text>
                          <Text weight="bold" className="text-accent-deep">
                            {setProgress.data.percent}%
                          </Text>
                        </View>
                        <ProgressBar value={setProgress.data.learned} max={setProgress.data.total} />
                        <Text className="text-xs text-muted">
                          Đã học {setProgress.data.learned}/{setProgress.data.total} · Đang học{' '}
                          {setProgress.data.learning} · Cần ôn {setProgress.data.needsReview}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() =>
                            router.push({
                              pathname: '/flashcards/notebook',
                              params: { setId: selectedSet.id, title: selectedSet.title },
                            })
                          }
                          className="mt-1 min-h-10 justify-center"
                        >
                          <Text weight="bold" className="text-sm text-accent-deep">
                            Xem từ đã lưu →
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </>
                ) : null}
                <QueryState pending={topics.isPending} error={topics.error} retry={() => void topics.refetch()} />
              </Panel>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/flashcards/notebook',
                  params: {
                    topicId: item.topicId,
                    ...(selectedSet ? { setId: selectedSet.id } : {}),
                    title: item.name,
                  },
                })
              }
              className="mb-3 gap-2 rounded-3xl border border-line bg-surface p-4"
            >
              <View className="flex-row items-center justify-between">
                <Text weight="bold" className="mr-2 flex-1" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text
                  weight="bold"
                  className="text-sm"
                  style={{ color: item.percent >= 100 ? colors.success : colors.accentDeep }}
                >
                  {item.percent}%
                </Text>
              </View>
              <Text className="text-sm text-muted">
                {item.learned}/{item.total} từ đã học
              </Text>
              <ProgressBar
                value={item.learned}
                max={item.total}
                color={item.percent >= 100 ? colors.success : colors.accent}
              />
            </Pressable>
          )}
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
