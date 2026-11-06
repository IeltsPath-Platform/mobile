import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
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

const achievementsLabels: Record<string, string> = { REVIEW_STREAK_7: 'Ôn từ 7 ngày liên tiếp', TOPIC_COMPLETED: 'Học hết từ trong một chủ đề', MASTERED_300: 'Ghi nhớ 300 từ' };
const panel = 'mb-4 gap-3 rounded-2xl border border-line bg-surface p-4';

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
  const topics = useQuery({ queryKey: [...key, 'topics-progress', selectedSet?.id], queryFn: () => notebookApi.topicsProgress(selectedSet?.id), enabled });
  const setProgress = useQuery({ queryKey: [...key, 'set-progress', selectedSet?.id], queryFn: () => notebookApi.setProgress(selectedSet!.id), enabled: enabled && Boolean(selectedSet) });
  const map = useQuery({ queryKey: [...key, 'vocabulary-map'], queryFn: () => notebookApi.vocabularyMap(), enabled: enabled && mapOpen });
  const achievements = useQuery({ queryKey: ['vocab', 'achievements', timezone], queryFn: () => vocabApi.achievements(timezone), enabled: enabled && achievementsOpen });
  const sets = useInfiniteQuery({ queryKey: ['vocab', 'sets', 'all'], queryFn: ({ pageParam, signal }) => vocabApi.listSets(undefined, pageParam, 30, signal), initialPageParam: 0, getNextPageParam: nextPage, enabled: enabled && setsOpen, staleTime: 300_000 });
  const saveGoal = useMutation({
    mutationFn: () => notebookApi.updateWeeklyGoal(Number(target), timezone),
    onSuccess: (value) => { client.setQueryData([...key, 'weekly-goal', timezone], value); setGoalOpen(false); },
  });
  const validTarget = /^\d+$/.test(target) && Number(target) >= 10 && Number(target) <= 1000;

  return <View className="flex-1 bg-canvas">
    <BackHeader title="Tiến độ từ vựng" fallbackHref="/(tabs)/flashcards" />
    {!enabled ? <FlashcardSignIn /> : <FlatList data={topics.data?.topics ?? []} keyExtractor={(topic) => topic.topicId} contentContainerClassName="px-5 pb-10" keyboardShouldPersistTaps="handled"
      refreshing={topics.isRefetching || summary.isRefetching}
      onRefresh={() => { void client.invalidateQueries({ queryKey: key }); void achievements.refetch(); }}
      ListHeaderComponent={<View>
        <View className={panel}>
          <Text weight="bold" className="text-lg">Sổ từ của bạn</Text>
          <QueryState pending={summary.isPending} error={summary.error} retry={() => void summary.refetch()} />
          {summary.data ? <><Text>{summary.data.total} từ đã lưu · {summary.data.dueNow} từ cần ôn</Text><Text className="text-sm text-muted">{summary.data.masteredCount} từ đã thuộc · {summary.data.learningCount} từ đang học</Text><Text className="text-sm text-muted">Hôm nay: {summary.data.reviewedToday} lượt ôn · 7 ngày qua: thêm {summary.data.addedLast7Days} từ</Text></> : null}
        </View>
        <View className={panel}>
          <View className="flex-row items-center justify-between"><Text weight="bold">Mục tiêu tuần</Text><Pressable accessibilityRole="button" disabled={!goal.data} onPress={() => { setTarget(String(goal.data?.target ?? 50)); setGoalOpen(!goalOpen); saveGoal.reset(); }} className="min-h-11 justify-center px-2"><Text className="text-sm text-accent-deep">{goalOpen ? 'Đóng' : 'Thay đổi'}</Text></Pressable></View>
          <QueryState pending={goal.isPending} error={goal.error} retry={() => void goal.refetch()} />
          {goal.data ? <><Text weight="bold" className="text-xl text-accent-deep">{goal.data.progress}/{goal.data.target} từ</Text><Text className="text-sm text-muted">{goal.data.remaining > 0 ? `Còn ${goal.data.remaining} từ để đạt mục tiêu.` : 'Bạn đã đạt mục tiêu tuần này!'}</Text><View className="flex-row justify-between">{goal.data.days.map((day, index) => <View key={day.date} accessibilityLabel={`${day.date}: ${day.achieved ? 'đã ôn' : 'chưa ôn'}`} className="items-center gap-1"><Text className="text-xs text-muted">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][index]}</Text><Text className="text-lg text-accent-deep">{day.achieved ? '✓' : '·'}</Text></View>)}</View></> : null}
          {goalOpen ? <><TextInput value={target} onChangeText={setTarget} keyboardType="number-pad" maxLength={4} accessibilityLabel="Mục tiêu số từ mỗi tuần" className="min-h-12 rounded-xl border border-line px-3 text-ink" /><Text className="text-xs text-muted">Từ 10 đến 1.000 từ mỗi tuần.</Text>{saveGoal.error ? <Text className="text-sm text-danger">{saveGoal.error.message}</Text> : null}<Button label="Lưu mục tiêu" disabled={!validTarget} loading={saveGoal.isPending} onPress={() => saveGoal.mutate()} /></> : null}
        </View>
        <View className={panel}>
          <Text weight="bold">Lượt ôn gần nhất</Text>
          <QueryState pending={recent.isPending} error={recent.error} retry={() => void recent.refetch()} />
          {recent.data ? <><Text>{recent.data.topic || 'Ôn thẻ từ'} · {recent.data.correct}/{recent.data.total} lượt trả lời đúng</Text><Text className="text-sm text-muted">{recent.data.percent}% · {new Date(recent.data.finishedAt).toLocaleString('vi-VN', { timeZone: timezone })}</Text></> : recent.isSuccess ? <Text className="text-sm text-muted">Chưa có lượt ôn được ghi nhận.</Text> : null}
        </View>
        <View className={panel}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: mapOpen }} onPress={() => setMapOpen(!mapOpen)} className="min-h-11 justify-center"><Text weight="bold">Bản đồ trình độ từ vựng {mapOpen ? '▴' : '▾'}</Text></Pressable>
          {mapOpen ? <><QueryState pending={map.isPending} error={map.error} retry={() => void map.refetch()} />{map.data?.suggestedBand ? <Text className="text-sm text-accent-deep">Gợi ý ôn: {map.data.suggestedBand}</Text> : null}{map.data?.bands.map((band) => <View key={band.cefr} className="gap-1 border-t border-line pt-3"><Text weight="bold">{band.cefr} · {band.band}</Text><Text className="text-sm text-muted">Đã học {band.learned}/{band.total} · Cần ôn {band.needsReview}</Text></View>)}</> : null}
        </View>
        <View className={panel}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: achievementsOpen }} onPress={() => setAchievementsOpen(!achievementsOpen)} className="min-h-11 justify-center"><Text weight="bold">Thành tích ôn từ {achievementsOpen ? '▴' : '▾'}</Text></Pressable>
          {achievementsOpen ? <><QueryState pending={achievements.isPending} error={achievements.error} retry={() => void achievements.refetch()} />{achievements.data?.items.map((item) => <View key={item.code} className="gap-1 border-t border-line pt-3"><Text>{item.achieved ? '✓ ' : ''}{achievementsLabels[item.code] ?? 'Thành tích từ vựng'}</Text><Text className="text-sm text-muted">{item.progress}/{item.target}</Text></View>)}</> : null}
        </View>
        <View className={panel}>
          <Text weight="bold" className="text-lg">Tiến độ theo chủ đề</Text>
          <Text className="text-sm text-muted">Tính từ lịch sử ôn và mức độ ghi nhớ trong sổ từ.</Text>
          <Button variant="secondary" label={selectedSet ? selectedSet.title : 'Lọc theo bộ từ hệ thống'} onPress={() => setSetsOpen(!setsOpen)} />
          {setsOpen ? <><Button variant="ghost" label="Tất cả bộ từ" onPress={() => { setSelectedSet(null); setSetsOpen(false); }} /><QueryState pending={sets.isPending} error={sets.error} retry={() => void sets.refetch()} />{sets.data?.pages.flatMap((page) => page.items).map((set) => <Pressable key={set.id} accessibilityRole="button" accessibilityState={{ selected: selectedSet?.id === set.id }} onPress={() => { setSelectedSet(set); setSetsOpen(false); }} className="min-h-12 justify-center border-t border-line py-2"><Text>{set.title}</Text></Pressable>)}{sets.hasNextPage ? <Button label="Thêm bộ từ" variant="ghost" loading={sets.isFetchingNextPage} onPress={() => void sets.fetchNextPage()} /> : null}</> : null}
          {selectedSet ? <><QueryState pending={setProgress.isPending} error={setProgress.error} retry={() => void setProgress.refetch()} />{setProgress.data ? <><Text>Đã học {setProgress.data.learned}/{setProgress.data.total} từ · {setProgress.data.percent}%</Text><Text className="text-sm text-muted">Đang học {setProgress.data.learning} · Cần ôn {setProgress.data.needsReview}</Text><Button variant="ghost" label="Xem từ đã lưu trong bộ này" onPress={() => router.push({ pathname: '/flashcards/notebook', params: { setId: selectedSet.id, title: selectedSet.title } })} /></> : null}</> : null}
          <QueryState pending={topics.isPending} error={topics.error} retry={() => void topics.refetch()} />
        </View>
      </View>}
      renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/flashcards/notebook', params: { topicId: item.topicId, ...(selectedSet ? { setId: selectedSet.id } : {}), title: item.name } })} className="mb-3 gap-2 rounded-2xl border border-line bg-surface p-4">
        <Text weight="bold">{item.name}</Text><Text className="text-sm text-muted">{item.learned}/{item.total} từ đã học · {item.percent}%</Text><View className="h-1.5 overflow-hidden rounded-full bg-canvas"><View className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, item.percent))}%`, backgroundColor: colors.accent }} /></View>
      </Pressable>}
      ListEmptyComponent={topics.isSuccess ? <Text className="py-5 text-center text-muted">Chưa có dữ liệu chủ đề.</Text> : undefined}
    />}
  </View>;
}
